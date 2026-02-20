/**
 * Audit logs routes
 * View and query organization audit logs
 */
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requirePermission } from "../../middleware/roles";
import { auditService } from "../../services/audit.service";

/**
 * Audit logs routes
 * All routes require authentication and organization membership
 */
export const auditLogsRoutes = new Elysia({ prefix: "/:orgId/audit-logs", tags: ["Audit Logs"] })
  .use(authMiddleware)
  .use(organizationMiddleware)
  .get(
    "/",
    async ({ query, organization }) => {
      const filters = {
        actorId: query.actorId,
        actorType: query.actorType,
        action: query.action,
        resourceType: query.resourceType,
        resourceId: query.resourceId,
        startDate: query.startDate ? new Date(query.startDate) : undefined,
        endDate: query.endDate ? new Date(query.endDate) : undefined,
        limit: query.limit,
        offset: query.offset,
      };

      const result = await auditService.list(organization.id, filters);

      return {
        success: true,
        data: result.logs,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total,
        },
      };
    },
    {
      beforeHandle: requirePermission("audit-logs:read"),
      query: t.Object({
        actorId: t.Optional(t.String({ description: "Filter by actor ID" })),
        actorType: t.Optional(
          t.Union([t.Literal("user"), t.Literal("api_key"), t.Literal("system")], {
            description: "Filter by actor type",
          })
        ),
        action: t.Optional(
          t.String({ description: "Filter by action (e.g., 'organization.updated')" })
        ),
        resourceType: t.Optional(
          t.String({ description: "Filter by resource type (e.g., 'organization')" })
        ),
        resourceId: t.Optional(t.String({ description: "Filter by resource ID" })),
        startDate: t.Optional(t.String({ description: "Filter by start date (ISO 8601)" })),
        endDate: t.Optional(t.String({ description: "Filter by end date (ISO 8601)" })),
        limit: t.Optional(
          t.Number({
            minimum: 1,
            maximum: 100,
            default: 50,
            description: "Number of logs to return (1-100)",
          })
        ),
        offset: t.Optional(
          t.Number({
            minimum: 0,
            default: 0,
            description: "Number of logs to skip",
          })
        ),
      }),
      detail: {
        summary: "List audit logs",
        description:
          "Get a paginated list of audit logs for the organization with optional filters",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of audit logs",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          organizationId: { type: "string" },
                          actorId: { type: "string", nullable: true },
                          actorType: { type: "string", enum: ["user", "api_key", "system"] },
                          actorEmail: { type: "string", nullable: true },
                          action: { type: "string" },
                          resourceType: { type: "string" },
                          resourceId: { type: "string", nullable: true },
                          oldValues: { type: "object", nullable: true },
                          newValues: { type: "object", nullable: true },
                          ipAddress: { type: "string", nullable: true },
                          userAgent: { type: "string", nullable: true },
                          metadata: { type: "object", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        limit: { type: "number" },
                        offset: { type: "number" },
                        hasMore: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
        },
      },
    }
  )
  .get(
    "/:id",
    async ({ params, organization }) => {
      const log = await auditService.get(organization.id, params.id);

      return {
        success: true,
        data: log,
      };
    },
    {
      beforeHandle: requirePermission("audit-logs:read"),
      params: t.Object({
        id: t.String({ description: "Audit log ID" }),
      }),
      detail: {
        summary: "Get audit log details",
        description: "Get detailed information about a specific audit log entry",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Audit log details",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        organizationId: { type: "string" },
                        actorId: { type: "string", nullable: true },
                        actorType: { type: "string", enum: ["user", "api_key", "system"] },
                        actorEmail: { type: "string", nullable: true },
                        action: { type: "string" },
                        resourceType: { type: "string" },
                        resourceId: { type: "string", nullable: true },
                        oldValues: { type: "object", nullable: true },
                        newValues: { type: "object", nullable: true },
                        ipAddress: { type: "string", nullable: true },
                        userAgent: { type: "string", nullable: true },
                        metadata: { type: "object", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
          404: { description: "Audit log not found" },
        },
      },
    }
  );
