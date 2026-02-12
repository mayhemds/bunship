/**
 * Webhook Management Routes
 * Handles CRUD operations for webhook endpoints
 */
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requirePermission } from "../../middleware/roles";
import {
  createEndpoint,
  getEndpoint,
  listEndpoints,
  updateEndpoint,
  deleteEndpoint,
  rotateSecret,
  sendTestEvent,
  getDeliveries,
  retryDelivery,
} from "../../services/webhook.service";

export const webhookRoutes = new Elysia({ prefix: "/:orgId/webhooks", tags: ["Webhooks"] })
  // Apply authentication and organization middleware
  .use(authMiddleware)
  .use(organizationMiddleware)

  /**
   * List webhook endpoints
   */
  .get(
    "/",
    async ({ params: { orgId } }) => {
      const endpoints = await listEndpoints(orgId);
      // Strip secrets from list response to avoid leaking them.
      // Secrets are only returned at creation time so users can copy them once.
      const sanitized = endpoints.map(({ secret, ...rest }) => rest);
      return {
        success: true,
        data: sanitized,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:read")],
      detail: {
        tags: ["Webhooks"],
        summary: "List webhook endpoints",
        description: "Get all webhook endpoints for the organization",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(
            t.Object({
              id: t.String(),
              organizationId: t.String(),
              url: t.String(),
              description: t.Union([t.String(), t.Null()]),
              events: t.Array(t.String()),
              isActive: t.Boolean(),
              createdAt: t.Date(),
              updatedAt: t.Date(),
            })
          ),
        }),
      },
    }
  )

  /**
   * Create webhook endpoint
   */
  .post(
    "/",
    async ({ params: { orgId }, body }) => {
      const endpoint = await createEndpoint(orgId, body);
      return {
        success: true,
        data: endpoint,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:create")],
      detail: {
        tags: ["Webhooks"],
        summary: "Create webhook endpoint",
        description: "Create a new webhook endpoint for the organization",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        url: t.String({
          format: "uri",
          description: "Webhook endpoint URL",
        }),
        description: t.Optional(
          t.String({
            description: "Description of what this webhook is for",
          })
        ),
        events: t.Optional(
          t.Array(t.String(), {
            description: "Array of event types to subscribe to (empty = all events)",
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Any(),
        }),
      },
    }
  )

  /**
   * Get webhook endpoint
   */
  .get(
    "/:id",
    async ({ params: { orgId, id } }) => {
      const endpoint = await getEndpoint(id, orgId);
      return {
        success: true,
        data: endpoint,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:read")],
      detail: {
        tags: ["Webhooks"],
        summary: "Get webhook endpoint",
        description: "Get details of a specific webhook endpoint",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Any(),
        }),
      },
    }
  )

  /**
   * Update webhook endpoint
   */
  .patch(
    "/:id",
    async ({ params: { orgId, id }, body }) => {
      const endpoint = await updateEndpoint(id, orgId, body);
      return {
        success: true,
        data: endpoint,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:update")],
      detail: {
        tags: ["Webhooks"],
        summary: "Update webhook endpoint",
        description: "Update an existing webhook endpoint",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        url: t.Optional(t.String({ format: "uri" })),
        description: t.Optional(t.String()),
        events: t.Optional(t.Array(t.String())),
        isActive: t.Optional(t.Boolean()),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Any(),
        }),
      },
    }
  )

  /**
   * Delete webhook endpoint
   */
  .delete(
    "/:id",
    async ({ params: { orgId, id } }) => {
      await deleteEndpoint(id, orgId);
      return {
        success: true,
        message: "Webhook endpoint deleted",
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:delete")],
      detail: {
        tags: ["Webhooks"],
        summary: "Delete webhook endpoint",
        description: "Delete a webhook endpoint",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          message: t.String(),
        }),
      },
    }
  )

  /**
   * Rotate webhook secret
   */
  .post(
    "/:id/rotate",
    async ({ params: { orgId, id } }) => {
      const result = await rotateSecret(id, orgId);
      return {
        success: true,
        data: result,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:update")],
      detail: {
        tags: ["Webhooks"],
        summary: "Rotate webhook secret",
        description: "Generate a new secret for webhook signature verification",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            secret: t.String(),
          }),
        }),
      },
    }
  )

  /**
   * Send test event
   */
  .post(
    "/:id/test",
    async ({ params: { orgId, id } }) => {
      const delivery = await sendTestEvent(id, orgId);
      return {
        success: true,
        data: delivery,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:update")],
      detail: {
        tags: ["Webhooks"],
        summary: "Send test event",
        description: "Send a test webhook event to verify endpoint configuration",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Any(),
        }),
      },
    }
  )

  /**
   * Get webhook deliveries
   */
  .get(
    "/:id/deliveries",
    async ({ params: { orgId, id }, query }) => {
      const deliveries = await getDeliveries(id, orgId, query.limit || 50);
      return {
        success: true,
        data: deliveries,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:read")],
      detail: {
        tags: ["Webhooks"],
        summary: "List webhook deliveries",
        description: "Get delivery history for a webhook endpoint",
        security: [{ bearerAuth: [] }],
      },
      query: t.Object({
        limit: t.Optional(
          t.Number({
            minimum: 1,
            maximum: 100,
            default: 50,
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(
            t.Object({
              id: t.String(),
              webhookId: t.String(),
              event: t.String(),
              payload: t.Any(),
              response: t.Union([t.String(), t.Null()]),
              statusCode: t.Union([t.Number(), t.Null()]),
              attempts: t.Number(),
              nextRetryAt: t.Union([t.Date(), t.Null()]),
              deliveredAt: t.Union([t.Date(), t.Null()]),
              createdAt: t.Date(),
            })
          ),
        }),
      },
    }
  )

  /**
   * Retry failed delivery
   */
  .post(
    "/deliveries/:deliveryId/retry",
    async ({ params: { orgId, deliveryId } }) => {
      // Verify the delivery belongs to a webhook owned by this organization
      const db = (await import("@bunship/database")).getDatabase();
      const { webhookDeliveries } = await import("@bunship/database/schema");
      const { eq } = await import("@bunship/database");

      const deliveryRecord = await db.query.webhookDeliveries.findFirst({
        where: eq(webhookDeliveries.id, deliveryId),
        with: { webhook: true },
      });

      if (!deliveryRecord || deliveryRecord.webhook.organizationId !== orgId) {
        const { NotFoundError } = await import("@bunship/utils");
        throw new NotFoundError("Delivery not found");
      }

      const delivery = await retryDelivery(deliveryId);
      return {
        success: true,
        data: delivery,
      };
    },
    {
      beforeHandle: [requirePermission("webhooks:update")],
      detail: {
        tags: ["Webhooks"],
        summary: "Retry webhook delivery",
        description: "Manually retry a failed webhook delivery",
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
