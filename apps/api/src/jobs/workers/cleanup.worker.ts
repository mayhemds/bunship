/**
 * Cleanup worker
 * Handles periodic maintenance tasks
 */
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import type { CleanupJobData } from "../queue";
import { getDatabase } from "@bunship/database";
import { auditLogs, webhookDeliveries, sessions } from "@bunship/database/schema";
import { lt, and, eq, isNull } from "drizzle-orm";

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
 * Clean up temporary files from storage
 * This is a placeholder - actual implementation depends on storage service
 */
async function cleanupTemporaryFiles() {
  try {
    // TODO: Implement when storage service is ready
    // This would:
    // 1. Query files table for temporary files older than X hours
    // 2. Delete from S3
    // 3. Delete from database

    console.log("Temporary files cleanup completed (placeholder)");
    return { cleaned: 0 };
  } catch (error) {
    console.error("Failed to clean up temporary files:", error);
    throw error;
  }
}

/**
 * Process cleanup job
 */
async function processCleanupJob(job: Job<CleanupJobData>) {
  const { task, organizationId, daysToKeep, metadata } = job.data;

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
