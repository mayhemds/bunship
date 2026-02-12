/**
 * Worker process entry point
 * Runs background job workers separately from the API server
 *
 * Usage:
 *   bun run src/worker.ts
 *
 * This should be run as a separate process or container from the API server
 * to handle background jobs (emails, webhooks, cleanup tasks).
 */
import { startWorkers, setupRecurringJobs, checkRedisHealth, closeQueues } from "./jobs";

async function stopWorkers(workers: {
  emailWorker: { close(): Promise<void> };
  webhookWorker: { close(): Promise<void> };
  cleanupWorker: { close(): Promise<void> };
}) {
  await Promise.all([
    workers.emailWorker.close(),
    workers.webhookWorker.close(),
    workers.cleanupWorker.close(),
  ]);
  await closeQueues();
}

async function main() {
  try {
    // Verify Redis is reachable before starting workers
    console.log("Checking Redis connection...");
    const redisHealthy = await checkRedisHealth();
    if (!redisHealthy) {
      console.error("Redis is not reachable. Exiting.");
      process.exit(1);
    }
    console.log("Redis connection OK");

    // Start all workers
    const workers = await startWorkers();

    // Setup recurring cleanup jobs
    await setupRecurringJobs();

    console.log("All workers started successfully");

    // Keep process alive
    process.on("SIGTERM", async () => {
      console.log("SIGTERM received, shutting down workers gracefully...");
      try {
        await stopWorkers(workers);
        console.log("Workers shut down successfully");
        process.exit(0);
      } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    });

    process.on("SIGINT", async () => {
      console.log("SIGINT received, shutting down workers gracefully...");
      try {
        await stopWorkers(workers);
        console.log("Workers shut down successfully");
        process.exit(0);
      } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
      }
    });
  } catch (error) {
    console.error("Failed to start workers:", error);
    process.exit(1);
  }
}

main();
