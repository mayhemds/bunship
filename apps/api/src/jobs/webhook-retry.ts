/**
 * Webhook Retry Job
 * Processes pending webhook deliveries that need to be retried
 *
 * This should be called periodically (e.g., every 1-5 minutes)
 * by a cron service or task scheduler
 */
import { processPendingRetries } from "../services/webhook.service";

/**
 * Process webhook retries
 * Can be called via cron endpoint or task scheduler
 */
export async function processWebhookRetries(): Promise<{
  success: boolean;
  processed: number;
}> {
  try {
    console.log("[Webhook Retry Job] Starting...");

    const processed = await processPendingRetries();

    console.log(`[Webhook Retry Job] Processed ${processed} deliveries`);

    return {
      success: true,
      processed,
    };
  } catch (error) {
    console.error("[Webhook Retry Job] Error:", error);
    throw error;
  }
}
