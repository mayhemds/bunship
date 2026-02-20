/**
 * Webhook worker
 * Processes webhook delivery jobs with signature verification
 */
import { Worker, Job } from "bullmq";
import IORedis from "ioredis";
import type { WebhookJobData } from "../queue";
import { getDatabase } from "@bunship/database";
import { webhookDeliveries } from "@bunship/database/schema";
import { eq } from "drizzle-orm";

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

/**
 * Generate HMAC signature for webhook payload
 */
async function generateSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(payload);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("HMAC", key, messageData);

  // Convert to hex string
  return Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Process webhook delivery job
 */
async function processWebhookJob(job: Job<WebhookJobData>) {
  const { webhookId, deliveryId, url, secret, event, payload, attempt } = job.data;
  const db = getDatabase();

  try {
    console.log(`Processing webhook job ${job.id} (attempt ${attempt}) to ${url}`);

    // Prepare payload
    const payloadString = JSON.stringify({
      event,
      data: payload,
      timestamp: new Date().toISOString(),
      delivery_id: deliveryId,
    });

    // Generate signature
    const signature = await generateSignature(payloadString, secret);

    // Send webhook request
    const startTime = Date.now();
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Event": event,
        "X-Webhook-Signature": signature,
        "X-Webhook-Delivery": deliveryId,
        "User-Agent": "BunShip-Webhooks/1.0",
      },
      body: payloadString,
      signal: AbortSignal.timeout(30000), // 30 second timeout
    });

    const duration = Date.now() - startTime;
    const responseText = await response.text();

    console.log(`Webhook delivered with status ${response.status} in ${duration}ms`);

    // Update delivery record
    if (response.ok) {
      await db
        .update(webhookDeliveries)
        .set({
          statusCode: response.status,
          response: responseText.slice(0, 1000), // Limit response size
          attempts: attempt,
          deliveredAt: new Date(),
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      return {
        success: true,
        statusCode: response.status,
        duration,
      };
    } else {
      // Non-2xx response, will be retried
      await db
        .update(webhookDeliveries)
        .set({
          statusCode: response.status,
          response: responseText.slice(0, 1000),
          attempts: attempt,
        })
        .where(eq(webhookDeliveries.id, deliveryId));

      throw new Error(
        `Webhook failed with status ${response.status}: ${responseText.slice(0, 200)}`
      );
    }
  } catch (error) {
    console.error(`Failed to deliver webhook (job ${job.id}):`, error);

    // Update delivery record with error
    await db
      .update(webhookDeliveries)
      .set({
        attempts: attempt,
        response: error instanceof Error ? error.message.slice(0, 1000) : "Unknown error",
        // Calculate next retry time based on exponential backoff
        nextRetryAt: new Date(Date.now() + Math.pow(2, attempt) * 5000),
      })
      .where(eq(webhookDeliveries.id, deliveryId));

    throw error; // Let BullMQ handle retries
  }
}

/**
 * Webhook worker instance
 */
export const webhookWorker = new Worker<WebhookJobData>("webhook", processWebhookJob, {
  connection,
  concurrency: 10, // Process 10 webhooks concurrently
  limiter: {
    max: 100, // Max 100 webhooks
    duration: 1000, // Per second
  },
});

/**
 * Worker event handlers
 */
webhookWorker.on("completed", (job) => {
  console.log(`Webhook job ${job.id} completed`);
});

webhookWorker.on("failed", (job, err) => {
  console.error(`Webhook job ${job?.id} failed after all retries:`, err.message);

  // Mark delivery as permanently failed after all retries
  if (job?.data.deliveryId) {
    getDatabase()
      .update(webhookDeliveries)
      .set({
        statusCode: 0,
        attempts: job.attemptsMade,
        response: `Failed after ${job.attemptsMade} attempts: ${err.message}`.slice(0, 1000),
        nextRetryAt: null,
      })
      .where(eq(webhookDeliveries.id, job.data.deliveryId))
      .catch((error) => {
        console.error("Failed to update webhook delivery:", error);
      });
  }
});

webhookWorker.on("error", (err) => {
  console.error("Webhook worker error:", err);
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, closing webhook worker...");
  await webhookWorker.close();
  await connection.quit();
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, closing webhook worker...");
  await webhookWorker.close();
  await connection.quit();
});
