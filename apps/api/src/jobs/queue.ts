/**
 * BullMQ Queue Configuration
 * Sets up queues for background job processing
 *
 * Redis connection and queues are created lazily so the API
 * boots cleanly without Redis running (for local development).
 * Queues are initialized on first use (e.g., when adding a job).
 */
import { Queue, QueueOptions } from "bullmq";
import IORedis from "ioredis";

/**
 * Lazy Redis connection — only created when getConnection() is called
 */
let connection: IORedis | null = null;

function getConnection(): IORedis {
  if (!connection) {
    connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });
    connection.on("error", (err) => {
      if ((err as NodeJS.ErrnoException).code !== "ECONNREFUSED") {
        console.error("Redis error:", err.message);
      }
    });
  }
  return connection;
}

/**
 * Default queue options (uses lazy connection)
 */
function getDefaultQueueOptions(): QueueOptions {
  return {
    connection: getConnection(),
    defaultJobOptions: {
      removeOnComplete: {
        count: 100, // Keep last 100 completed jobs
        age: 24 * 3600, // Keep for 24 hours
      },
      removeOnFail: {
        count: 1000, // Keep last 1000 failed jobs
        age: 7 * 24 * 3600, // Keep for 7 days
      },
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000, // Start with 2 seconds
      },
    },
  };
}

/**
 * Email queue
 * For sending transactional emails via Resend
 */
export interface EmailJobData {
  to: string | string[];
  from?: string;
  subject: string;
  html?: string;
  text?: string;
  templateId?: string;
  templateData?: Record<string, unknown>;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
  tags?: Record<string, string>;
  metadata?: Record<string, unknown>;
}

let emailQueue: Queue<EmailJobData> | null = null;

function getEmailQueue(): Queue<EmailJobData> {
  if (!emailQueue) {
    emailQueue = new Queue<EmailJobData>("email", getDefaultQueueOptions());
  }
  return emailQueue;
}

/**
 * Webhook queue
 * For dispatching webhooks to external endpoints
 */
export interface WebhookJobData {
  webhookId: string;
  deliveryId: string;
  url: string;
  secret: string;
  event: string;
  payload: Record<string, unknown>;
  attempt: number;
}

let webhookQueue: Queue<WebhookJobData> | null = null;

function getWebhookQueue(): Queue<WebhookJobData> {
  if (!webhookQueue) {
    const opts = getDefaultQueueOptions();
    webhookQueue = new Queue<WebhookJobData>("webhook", {
      ...opts,
      defaultJobOptions: {
        ...opts.defaultJobOptions,
        attempts: 5, // More retries for webhooks
        backoff: {
          type: "exponential",
          delay: 5000, // Start with 5 seconds
        },
      },
    });
  }
  return webhookQueue;
}

/**
 * Cleanup queue
 * For periodic maintenance tasks
 */
export interface CleanupJobData {
  task: "expired-tokens" | "old-audit-logs" | "failed-deliveries" | "temporary-files";
  organizationId?: string;
  daysToKeep?: number;
  metadata?: Record<string, unknown>;
}

let cleanupQueue: Queue<CleanupJobData> | null = null;

function getCleanupQueue(): Queue<CleanupJobData> {
  if (!cleanupQueue) {
    const opts = getDefaultQueueOptions();
    cleanupQueue = new Queue<CleanupJobData>("cleanup", {
      ...opts,
      defaultJobOptions: {
        ...opts.defaultJobOptions,
        attempts: 1, // Don't retry cleanup tasks
      },
    });
  }
  return cleanupQueue;
}

/**
 * Helper function to add an email job
 */
export async function addEmailJob(
  data: EmailJobData,
  options?: { delay?: number; priority?: number }
) {
  return getEmailQueue().add("send-email", data, {
    delay: options?.delay,
    priority: options?.priority,
  });
}

/**
 * Helper function to add a webhook job
 */
export async function addWebhookJob(data: WebhookJobData, options?: { delay?: number }) {
  return getWebhookQueue().add("dispatch-webhook", data, {
    delay: options?.delay,
    // Ensure webhook deliveries are processed in order for the same webhook
    jobId: `${data.webhookId}-${data.deliveryId}`,
  });
}

/**
 * Helper function to add a cleanup job
 */
export async function addCleanupJob(
  data: CleanupJobData,
  options?: { delay?: number; repeat?: { cron: string } }
) {
  return getCleanupQueue().add("cleanup-task", data, {
    delay: options?.delay,
    repeat: options?.repeat,
  });
}

/**
 * Health check for Redis connection.
 * Returns false immediately if no connection has been created yet
 * (avoids creating a connection just for the health check).
 * Times out after 2 seconds so /health/ready never hangs.
 */
export async function checkRedisHealth(): Promise<boolean> {
  if (!connection) return false;
  try {
    const pong = await Promise.race([
      connection.ping(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("timeout")), 2000)),
    ]);
    return pong === "PONG";
  } catch {
    return false;
  }
}

/**
 * Gracefully close all queues
 */
export async function closeQueues() {
  const closes: Promise<void>[] = [];
  if (emailQueue) closes.push(emailQueue.close());
  if (webhookQueue) closes.push(webhookQueue.close());
  if (cleanupQueue) closes.push(cleanupQueue.close());
  if (connection) closes.push(connection.quit().then(() => {}));
  await Promise.all(closes);
}

// Re-export queue getters for worker processes
export { getEmailQueue, getWebhookQueue, getCleanupQueue, getConnection };
