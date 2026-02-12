/**
 * Cron/Scheduled Job Endpoints
 * Protected endpoints for scheduled tasks
 */
import { Elysia, t } from "elysia";
import { processWebhookRetries } from "../jobs/webhook-retry";

const CRON_SECRET = process.env.CRON_SECRET;

// Fail fast at startup if CRON_SECRET is missing in production
if (!CRON_SECRET && process.env.NODE_ENV === "production") {
  throw new Error("CRON_SECRET must be configured in production");
}

/**
 * Verify cron secret for scheduled job endpoints
 */
function verifyCronSecret(secret: string | undefined): boolean {
  if (!CRON_SECRET) {
    console.warn("CRON_SECRET not configured - cron endpoints are unprotected in development!");
    return true;
  }
  // Use timing-safe comparison
  if (!secret || secret.length !== CRON_SECRET.length) return false;
  const encoder = new TextEncoder();
  const a = encoder.encode(secret);
  const b = encoder.encode(CRON_SECRET);
  return crypto.subtle.timingSafeEqual(a, b);
}

export const cronRoutes = new Elysia({ prefix: "/cron" })
  /**
   * Process webhook retries
   * Should be called every 1-5 minutes
   */
  .post(
    "/webhook-retries",
    async ({ headers, set }) => {
      const cronSecret = headers["x-cron-secret"];

      if (!verifyCronSecret(cronSecret)) {
        set.status = 401;
        return {
          error: "Unauthorized",
          message: "Invalid cron secret",
        };
      }

      const result = await processWebhookRetries();

      return result;
    },
    {
      detail: {
        tags: ["Cron"],
        summary: "Process webhook retries",
        description:
          "Processes pending webhook deliveries that need to be retried. Protected by X-Cron-Secret header.",
      },
      headers: t.Object({
        "x-cron-secret": t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          processed: t.Number(),
        }),
        401: t.Object({
          error: t.String(),
          message: t.String(),
        }),
      },
    }
  );
