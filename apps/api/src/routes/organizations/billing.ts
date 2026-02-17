/**
 * Billing Routes
 * Handles subscription and billing operations
 */
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import {
  getSubscription,
  createPortalSession,
  createCheckoutSession,
  cancelSubscription,
  getInvoices,
  getUsage,
} from "../../services/billing.service";
import { appConfig } from "@bunship/config";
import { requirePermission } from "../../middleware/roles";
import { ValidationError } from "@bunship/utils";

/**
 * Validate that a redirect URL's origin matches the configured frontend URL.
 * Prevents open redirect attacks via Stripe return/cancel URLs.
 */
function validateReturnUrl(url: string): void {
  try {
    const parsed = new URL(url);
    const allowed = new URL(appConfig.frontendUrl);
    if (parsed.origin !== allowed.origin) {
      throw new ValidationError("Return URL must match the application origin");
    }
  } catch (e) {
    if (e instanceof ValidationError) throw e;
    throw new ValidationError("Invalid return URL");
  }
}

export const billingRoutes = new Elysia({ prefix: "/:orgId/billing", tags: ["Billing"] })
  // Apply authentication and organization middleware
  .use(authMiddleware)
  .use(organizationMiddleware)

  /**
   * Get subscription status
   */
  .get(
    "/",
    async ({ params: { orgId } }) => {
      const subscription = await getSubscription(orgId);
      return {
        success: true,
        data: subscription,
      };
    },
    {
      beforeHandle: requirePermission("billing:read"),
      detail: {
        tags: ["Billing"],
        summary: "Get subscription status",
        description: "Get current subscription and plan details for the organization",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            plan: t.Any(),
            status: t.String(),
            subscription: t.Any(),
          }),
        }),
      },
    }
  )

  /**
   * Get Stripe Customer Portal URL
   */
  .get(
    "/portal",
    async ({ params: { orgId }, query }) => {
      if (query.return_url) {
        validateReturnUrl(query.return_url);
      }
      const session = await createPortalSession(orgId, query.return_url);
      return {
        success: true,
        data: {
          url: session.url,
        },
      };
    },
    {
      beforeHandle: requirePermission("billing:manage"),
      detail: {
        tags: ["Billing"],
        summary: "Get billing portal URL",
        description: "Create a Stripe Customer Portal session to manage subscription",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        return_url: t.Optional(t.String()),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            url: t.String(),
          }),
        }),
      },
    }
  )

  /**
   * Create checkout session
   */
  .post(
    "/checkout",
    async ({ params: { orgId }, body }) => {
      if (body.successUrl) {
        validateReturnUrl(body.successUrl);
      }
      if (body.cancelUrl) {
        validateReturnUrl(body.cancelUrl);
      }
      const session = await createCheckoutSession(
        orgId,
        body.priceId,
        body.successUrl,
        body.cancelUrl
      );

      return {
        success: true,
        data: {
          sessionId: session.id,
          url: session.url ?? "",
        },
      };
    },
    {
      beforeHandle: requirePermission("billing:manage"),
      detail: {
        tags: ["Billing"],
        summary: "Create checkout session",
        description: "Create a Stripe Checkout session to subscribe to a plan",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        priceId: t.String({
          description: "Stripe Price ID for the plan",
        }),
        successUrl: t.Optional(
          t.String({
            description: "URL to redirect to after successful checkout",
          })
        ),
        cancelUrl: t.Optional(
          t.String({
            description: "URL to redirect to if checkout is canceled",
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            sessionId: t.String(),
            url: t.String(),
          }),
        }),
      },
    }
  )

  /**
   * Cancel subscription
   */
  .post(
    "/cancel",
    async ({ params: { orgId } }) => {
      const result = await cancelSubscription(orgId);
      return {
        success: true,
        data: result,
      };
    },
    {
      beforeHandle: requirePermission("billing:manage"),
      detail: {
        tags: ["Billing"],
        summary: "Cancel subscription",
        description: "Cancel the subscription at the end of the current billing period",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            success: t.Boolean(),
            cancelAt: t.Date(),
          }),
        }),
      },
    }
  )

  /**
   * Get invoices
   */
  .get(
    "/invoices",
    async ({ params: { orgId }, query }) => {
      const invoices = await getInvoices(orgId, query.limit || 10);
      return {
        success: true,
        data: invoices as any,
      };
    },
    {
      beforeHandle: requirePermission("billing:read"),
      detail: {
        tags: ["Billing"],
        summary: "List invoices",
        description: "Get list of invoices for the organization",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        limit: t.Optional(
          t.Number({
            minimum: 1,
            maximum: 100,
            default: 10,
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(
            t.Object({
              id: t.String(),
              number: t.Union([t.String(), t.Null()]),
              status: t.Union([t.String(), t.Null()]),
              amount: t.Number(),
              currency: t.String(),
              created: t.Date(),
              dueDate: t.Union([t.Date(), t.Null()]),
              paidAt: t.Union([t.Date(), t.Null()]),
              hostedInvoiceUrl: t.Union([t.String(), t.Null()]),
              invoicePdf: t.Union([t.String(), t.Null()]),
            })
          ),
        }),
      },
    }
  )

  /**
   * Get usage statistics
   */
  .get(
    "/usage",
    async ({ params: { orgId } }) => {
      const usage = await getUsage(orgId);
      return {
        success: true,
        data: usage,
      };
    },
    {
      beforeHandle: requirePermission("billing:read"),
      detail: {
        tags: ["Billing"],
        summary: "Get usage statistics",
        description: "Get current usage stats compared to plan limits",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Any(),
        }),
      },
    }
  );
