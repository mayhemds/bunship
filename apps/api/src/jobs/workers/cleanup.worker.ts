/**
 * Cleanup worker
 * Handles periodic maintenance tasks
 */
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import { S3Client, DeleteObjectsCommand } from "@aws-sdk/client-s3";
import type { CleanupJobData } from "../queue";
import { getDatabase } from "@bunship/database";
import { auditLogs, webhookDeliveries, sessions, files } from "@bunship/database/schema";
import { lt, and, eq, isNull, inArray } from "drizzle-orm";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Clean up expired sessions/tokens
 */
async function cleanupExpiredTokens() {
  const db = getDatabase();
  const expiryDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago

  try {
    const result = await db.delete(sessions).where(lt(sessions.expiresAt, expiryDate));

    console.log(`Cleaned up expired sessions`);
    return { cleaned: result.rowsAffected ?? 0 };
  } catch (error) {
    console.error("Failed to clean up expired tokens:", error);
    throw error;
  }
}

/**
 * Clean up old audit logs
 */
async function cleanupOldAuditLogs(daysToKeep = 90, organizationId?: string) {
  const db = getDatabase();
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  try {
    const conditions = [lt(auditLogs.createdAt, cutoffDate)];

    if (organizationId) {
      conditions.push(eq(auditLogs.organizationId, organizationId));
    }

    const result = await db.delete(auditLogs).where(and(...conditions));

    console.log(`Cleaned up audit logs older than ${daysToKeep} days`);
    return { cleaned: result.rowsAffected ?? 0 };
  } catch (error) {
    console.error("Failed to clean up audit logs:", error);
    throw error;
  }
}

/**
 * Clean up old failed webhook deliveries
 */
async function cleanupFailedDeliveries(daysToKeep = 7) {
  const db = getDatabase();
  const cutoffDate = new Date(Date.now() - daysToKeep * 24 * 60 * 60 * 1000);

  try {
    // Delete old failed deliveries (where deliveredAt is null and created more than X days ago)
    const result = await db
      .delete(webhookDeliveries)
      .where(
        and(isNull(webhookDeliveries.deliveredAt), lt(webhookDeliveries.createdAt, cutoffDate))
      );

    console.log(`Cleaned up failed webhook deliveries older than ${daysToKeep} days`);
    return { cleaned: result.rowsAffected ?? 0 };
  } catch (error) {
    console.error("Failed to clean up webhook deliveries:", error);
    throw error;
  }
}

/**
 * Clean up expired/temporary files from S3 and the files table.
 * "Temporary" here means files with an `expiresAt` in the past, or files
 * soft-deleted more than 30 days ago. S3 objects are deleted in batches of
 * 1000 (the `DeleteObjects` API limit).
 */
async function cleanupTemporaryFiles() {
  const db = getDatabase();
  const now = new Date();
  const softDeleteCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const expired = await db.query.files.findMany({
    where: (file, { or }) => or(lt(file.expiresAt, now), lt(file.deletedAt, softDeleteCutoff)),
    limit: 5000,
  });

  if (expired.length === 0) {
    return { cleaned: 0 };
  }

  const s3 = new S3Client({
    region: process.env.AWS_REGION ?? "us-east-1",
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    credentials:
      process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
          }
        : undefined,
  });

  const byBucket = new Map<string, typeof expired>();
  for (const f of expired) {
    const list = byBucket.get(f.bucket) ?? [];
    list.push(f);
    byBucket.set(f.bucket, list);
  }

  const deletedIds: string[] = [];
  for (const [bucket, bucketFiles] of byBucket) {
    for (let i = 0; i < bucketFiles.length; i += 1000) {
      const chunk = bucketFiles.slice(i, i + 1000);
      try {
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: bucket,
            Delete: { Objects: chunk.map((f) => ({ Key: f.key })), Quiet: true },
          })
        );
        deletedIds.push(...chunk.map((f) => f.id));
      } catch (err) {
        console.error(`Failed to delete S3 batch in bucket ${bucket}:`, err);
      }
    }
  }

  if (deletedIds.length > 0) {
    await db.delete(files).where(inArray(files.id, deletedIds));
  }

  return { cleaned: deletedIds.length };
}

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job<CleanupJobData>) {
  const { task, organizationId, daysToKeep } = job.data;

  console.log(`Processing cleanup job ${job.id}: ${task}`);

  let result;

  switch (task) {
    case "expired-tokens":
      result = await cleanupExpiredTokens();
      break;

    case "old-audit-logs":
      result = await cleanupOldAuditLogs(daysToKeep, organizationId);
      break;

    case "failed-deliveries":
      result = await cleanupFailedDeliveries(daysToKeep);
      break;

    case "temporary-files":
      result = await cleanupTemporaryFiles();
      break;

    default:
      throw new Error(`Unknown cleanup task: ${task}`);
  }

  console.log(`Cleanup job ${job.id} completed:`, result);
  return result;
}

/**
 * Cleanup worker instance
 */
export const cleanupWorker = new Worker<CleanupJobData>("cleanup", processCleanupJob, {
  connection,
  concurrency: 1, // Run cleanup tasks one at a time
});

/**
 * Worker event handlers
 */
cleanupWorker.on("completed", (job) => {
  console.log(`Cleanup job ${job.id} completed`);
});

cleanupWorker.on("failed", (job, err) => {
  console.error(`Cleanup job ${job?.id} failed:`, err.message);
});

cleanupWorker.on("error", (err) => {
  console.error("Cleanup worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing cleanup worker...");
  await cleanupWorker.close();
  await connection.quit();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing cleanup worker...");
  await cleanupWorker.close();
  await connection.quit();
});
