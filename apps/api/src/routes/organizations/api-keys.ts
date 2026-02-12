/**
 * API Key Management Routes
 * Handles CRUD operations for API keys
 */
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requirePermission } from "../../middleware/roles";
import {
  createApiKey,
  listApiKeys,
  getApiKey,
  revokeApiKey,
  getApiKeyUsage,
} from "../../services/apiKey.service";

export const apiKeyRoutes = new Elysia({ prefix: "/:orgId/api-keys", tags: ["API Keys"] })
  // Apply authentication and organization middleware
  .use(authMiddleware)
  .use(organizationMiddleware)

  /**
   * List API keys
   */
  .get(
    "/",
    async ({ params: { orgId } }) => {
      const keys = await listApiKeys(orgId);

      // Remove sensitive hash from response
      const sanitizedKeys = keys.map((key) => ({
        id: key.id,
        name: key.name,
        prefix: key.keyPrefix,
        scopes: key.scopes,
        rateLimit: key.rateLimit,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        isActive: key.isActive,
        createdAt: key.createdAt,
      }));

      return {
        success: true,
        data: sanitizedKeys,
      };
    },
    {
      beforeHandle: [requirePermission("api-keys:read")],
      detail: {
        tags: ["API Keys"],
        summary: "List API keys",
        description: "Get all API keys for the organization",
        security: [{ bearerAuth: [] }],
      },
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Array(
            t.Object({
              id: t.String(),
              name: t.String(),
              prefix: t.String(),
              scopes: t.Array(t.String()),
              rateLimit: t.Union([t.Number(), t.Null()]),
              lastUsedAt: t.Union([t.Date(), t.Null()]),
              expiresAt: t.Union([t.Date(), t.Null()]),
              isActive: t.Boolean(),
              createdAt: t.Date(),
            })
          ),
        }),
      },
    }
  )

  /**
   * Create API key
   */
  .post(
    "/",
    async ({ params: { orgId }, body, user }) => {
      const { apiKey, plainKey } = await createApiKey(orgId, user.id, body);

      return {
        success: true,
        data: {
          id: apiKey.id,
          name: apiKey.name,
          key: plainKey, // Only shown once!
          prefix: apiKey.keyPrefix,
          scopes: apiKey.scopes,
          rateLimit: apiKey.rateLimit,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
        },
        message: "API key created successfully. Save it now - you won't be able to see it again!",
      };
    },
    {
      beforeHandle: [requirePermission("api-keys:create")],
      detail: {
        tags: ["API Keys"],
        summary: "Create API key",
        description: "Create a new API key for the organization. The key is only shown once!",
        security: [{ bearerAuth: [] }],
      },
      body: t.Object({
        name: t.String({
          minLength: 1,
          maxLength: 100,
          description: "Descriptive name for the API key",
        }),
        scopes: t.Optional(
          t.Array(t.String(), {
            description: "Array of permission scopes (empty = full access)",
          })
        ),
        rateLimit: t.Optional(
          t.Number({
            minimum: 1,
            description: "Requests per minute limit",
          })
        ),
        expiresAt: t.Optional(
          t.String({
            format: "date-time",
            description: "Expiration date (optional)",
          })
        ),
      }),
      response: {
        200: t.Object({
          success: t.Boolean(),
          data: t.Object({
            id: t.String(),
            name: t.String(),
            key: t.String({
              description: "The actual API key - save it now!",
            }),
            prefix: t.String(),
            scopes: t.Array(t.String()),
            rateLimit: t.Union([t.Number(), t.Null()]),
            expiresAt: t.Union([t.Date(), t.Null()]),
            createdAt: t.Date(),
          }),
          message: t.String(),
        }),
      },
    }
  )

  /**
   * Get API key details
   */
  .get(
    "/:id",
    async ({ params: { orgId, id } }) => {
      const key = await getApiKey(id, orgId);

      return {
        success: true,
        data: {
          id: key.id,
          name: key.name,
          prefix: key.keyPrefix,
          scopes: key.scopes,
          rateLimit: key.rateLimit,
          lastUsedAt: key.lastUsedAt,
          expiresAt: key.expiresAt,
          isActive: key.isActive,
          createdAt: key.createdAt,
        },
      };
    },
    {
      beforeHandle: [requirePermission("api-keys:read")],
      detail: {
        tags: ["API Keys"],
        summary: "Get API key details",
        description: "Get details of a specific API key",
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
   * Revoke API key
   */
  .delete(
    "/:id",
    async ({ params: { orgId, id } }) => {
      await revokeApiKey(id, orgId);

      return {
        success: true,
        message: "API key revoked successfully",
      };
    },
    {
      beforeHandle: [requirePermission("api-keys:delete")],
      detail: {
        tags: ["API Keys"],
        summary: "Revoke API key",
        description: "Permanently revoke an API key",
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
   * Get API key usage
   */
  .get(
    "/:id/usage",
    async ({ params: { orgId, id } }) => {
      const usage = await getApiKeyUsage(id, orgId);

      return {
        success: true,
        data: usage,
      };
    },
    {
      beforeHandle: [requirePermission("api-keys:read")],
      detail: {
        tags: ["API Keys"],
        summary: "Get API key usage",
        description: "Get usage statistics for an API key",
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
