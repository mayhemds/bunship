/**
 * Background jobs module
 * Exports queues and workers for background job processing
 */

// Export queues and queue helpers
export * from "./queue";

// Export workers (for running in separate processes)
export { emailWorker } from "./workers/email.worker";
export { webhookWorker } from "./workers/webhook.worker";
export { cleanupWorker } from "./workers/cleanup.worker";

/**
 * Start all workers
 * Call this function to start processing background jobs
 * Typically called in a separate worker process
 *
 * @example
 * ```typescript
 * // In your worker process (e.g., worker.ts)
 * import { startWorkers } from "./jobs";
 * startWorkers();
 * ```
 */
export async function startWorkers() {
  console.log("Starting BunShip background workers...");

  // Workers are automatically started when imported
  // Just need to import them to activate
  const { emailWorker } = await import("./workers/email.worker");
  const { webhookWorker } = await import("./workers/webhook.worker");
  const { cleanupWorker } = await import("./workers/cleanup.worker");

  console.log(`
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🔧 BunShip Workers Running                            │
│                                                         │
│   Email Worker:    Active (concurrency: 5)             │
│   Webhook Worker:  Active (concurrency: 10)            │
│   Cleanup Worker:  Active (concurrency: 1)             │
│                                                         │
└─────────────────────────────────────────────────────────┘
  `);

  return {
    emailWorker,
    webhookWorker,
    cleanupWorker,
  };
}

/**
 * Setup recurring cleanup jobs
 * Schedule periodic maintenance tasks
 *
 * @example
 * ```typescript
 * import { setupRecurringJobs } from "./jobs";
 * await setupRecurringJobs();
 * ```
 */
export async function setupRecurringJobs() {
  const { addCleanupJob } = await import("./queue");

  // Clean up expired tokens daily at 2 AM
  await addCleanupJob(
    { task: "expired-tokens" },
    {
      repeat: {
        cron: "0 2 * * *", // Daily at 2 AM
      },
      jobId: "cleanup-expired-tokens", // Unique ID prevents duplicates across workers
    }
  );

  // Clean up old audit logs weekly on Sunday at 3 AM
  await addCleanupJob(
    {
      task: "old-audit-logs",
      daysToKeep: 90, // Keep last 90 days
    },
    {
      repeat: {
        cron: "0 3 * * 0", // Weekly on Sunday at 3 AM
      },
      jobId: "cleanup-old-audit-logs", // Unique ID prevents duplicates across workers
    }
  );

  // Clean up failed deliveries daily at 4 AM
  await addCleanupJob(
    {
      task: "failed-deliveries",
      daysToKeep: 7, // Keep last 7 days
    },
    {
      repeat: {
        cron: "0 4 * * *", // Daily at 4 AM
      },
      jobId: "cleanup-failed-deliveries", // Unique ID prevents duplicates across workers
    }
  );

  // Clean up temporary files every 6 hours
  await addCleanupJob(
    { task: "temporary-files" },
    {
      repeat: {
        cron: "0 */6 * * *", // Every 6 hours
      },
      jobId: "cleanup-temporary-files", // Unique ID prevents duplicates across workers
    }
  );

  console.log("Recurring cleanup jobs scheduled");
}
