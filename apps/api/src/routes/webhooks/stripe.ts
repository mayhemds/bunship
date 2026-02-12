/**
 * Stripe Webhook Handler
 * Processes Stripe events for subscription management
 */
import { Elysia } from "elysia";
import Stripe from "stripe";
import { getStripe } from "../../services/billing.service";
import { getDatabase, subscriptions, auditLogs, eq, and } from "@bunship/database";
import { billingConfig } from "@bunship/config";

if (!process.env.STRIPE_WEBHOOK_SECRET) {
  console.warn("STRIPE_WEBHOOK_SECRET is not set - webhook signature verification disabled");
}

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Verify Stripe webhook signature
 */
function verifyWebhookSignature(payload: string, signature: string | undefined): Stripe.Event {
  if (!WEBHOOK_SECRET) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  }

  if (!signature) {
    throw new Error("Missing Stripe signature header");
  }

  try {
    return getStripe().webhooks.constructEvent(payload, signature, WEBHOOK_SECRET);
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`);
  }
}

/**
 * Update subscription in database from Stripe subscription object
 */
async function updateSubscriptionFromStripe(
  stripeSubscription: Stripe.Subscription
): Promise<void> {
  const db = getDatabase();
  const orgId = stripeSubscription.metadata.organizationId;

  if (!orgId) {
    console.error("No organizationId in subscription metadata:", stripeSubscription.id);
    return;
  }

  // Determine plan ID from price
  const priceId = stripeSubscription.items.data[0]?.price.id;
  let planId = "free";

  for (const plan of billingConfig.plans) {
    if (plan.stripePriceIds.monthly === priceId || plan.stripePriceIds.yearly === priceId) {
      planId = plan.id;
      break;
    }
  }

  // Upsert subscription
  const existing = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
  });

  const data = {
    organizationId: orgId,
    stripeCustomerId: stripeSubscription.customer as string,
    stripeSubscriptionId: stripeSubscription.id,
    stripePriceId: priceId,
    status: stripeSubscription.status,
    planId,
    currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
    currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
    cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
    trialStart: stripeSubscription.trial_start
      ? new Date(stripeSubscription.trial_start * 1000)
      : null,
    trialEnd: stripeSubscription.trial_end ? new Date(stripeSubscription.trial_end * 1000) : null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(subscriptions).set(data).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values(data);
  }
}

export const stripeWebhookRoutes = new Elysia({ prefix: "/webhooks/stripe" })
  /**
   * Handle Stripe webhook events
   * Uses raw body for accurate signature verification.
   * Body parsing is disabled via `parse` to preserve the original payload.
   */
  .post(
    "/",
    async ({ request, set }) => {
      try {
        const signature = request.headers.get("stripe-signature");
        if (!signature) {
          set.status = 400;
          return {
            error: "Missing stripe-signature header",
            message: "Missing stripe-signature header",
          };
        }

        // Read raw body before any JSON parsing to preserve exact bytes for signature verification
        const rawBody = await request.text();

        // Verify webhook signature using the raw body
        let event: Stripe.Event;
        try {
          event = verifyWebhookSignature(rawBody, signature);
        } catch (err) {
          set.status = 400;
          return {
            error: "Webhook signature verification failed",
            message: err instanceof Error ? err.message : "Signature verification failed",
          };
        }

        const db = getDatabase();

        // Idempotency check: skip if we already processed this event
        const existing = await db.query.auditLogs.findFirst({
          where: and(
            eq(auditLogs.action, "stripe.webhook"),
            eq(auditLogs.resourceId, event.id)
          ),
        });

        if (existing) {
          return { received: true, message: "Already processed" };
        }

        console.log(`Processing Stripe event: ${event.type}`);

        // Handle different event types
        switch (event.type) {
          case "checkout.session.completed": {
            const session = event.data.object as Stripe.Checkout.Session;

            // Retrieve the subscription from the session
            if (session.subscription) {
              const subscription = await getStripe().subscriptions.retrieve(
                session.subscription as string
              );
              await updateSubscriptionFromStripe(subscription);
            }

            console.log(`Checkout completed for customer: ${session.customer}`);
            break;
          }

          case "customer.subscription.created":
          case "customer.subscription.updated": {
            const subscription = event.data.object as Stripe.Subscription;
            await updateSubscriptionFromStripe(subscription);
            console.log(`Subscription ${event.type}: ${subscription.id}`);
            break;
          }

          case "customer.subscription.deleted": {
            const subscription = event.data.object as Stripe.Subscription;
            const orgId = subscription.metadata.organizationId;

            if (orgId) {
              await db
                .update(subscriptions)
                .set({
                  status: "canceled",
                  planId: "free",
                  updatedAt: new Date(),
                })
                .where(eq(subscriptions.organizationId, orgId));

              console.log(`Subscription canceled for org: ${orgId}`);
            }
            break;
          }

          case "invoice.paid": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`Invoice paid: ${invoice.id}`);
            // Could send email notification here
            break;
          }

          case "invoice.payment_failed": {
            const invoice = event.data.object as Stripe.Invoice;
            console.log(`Invoice payment failed: ${invoice.id}`);

            // Update subscription status if needed
            if (invoice.subscription) {
              const subscription = await getStripe().subscriptions.retrieve(
                invoice.subscription as string
              );
              await updateSubscriptionFromStripe(subscription);
            }
            // Could send email notification here
            break;
          }

          case "customer.subscription.trial_will_end": {
            const subscription = event.data.object as Stripe.Subscription;
            console.log(`Trial ending soon: ${subscription.id}`);
            // Could send email reminder here
            break;
          }

          default:
            console.log(`Unhandled event type: ${event.type}`);
        }

        // Log processed event for idempotency tracking
        await db.insert(auditLogs).values({
          organizationId: "system",
          actorType: "system",
          action: "stripe.webhook",
          resourceType: "stripe_event",
          resourceId: event.id,
          metadata: { type: event.type },
        });

        return { received: true };
      } catch (error) {
        console.error("Stripe webhook error:", error);
        set.status = 400;
        return {
          error: "Webhook error",
          message: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    {
      // Disable Elysia body parsing so we can read raw body for signature verification
      parse: [] as any,
      detail: {
        tags: ["Webhooks"],
        summary: "Stripe webhook endpoint",
        description: "Receives and processes Stripe webhook events",
      },
      response: {
        200: {
          type: "object",
          properties: {
            received: { type: "boolean" },
          },
        },
        400: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
          },
        },
      },
    }
  );
