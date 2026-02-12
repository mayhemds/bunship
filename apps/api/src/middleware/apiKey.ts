/**
 * API Key Authentication Middleware
 * Validates X-API-Key header and attaches organization context
 */
import { Elysia } from "elysia";
import { validateApiKey } from "../services/apiKey.service";
import { AuthenticationError, AuthorizationError } from "@bunship/utils";
import type { ApiKey } from "@bunship/database";

export interface ApiKeyContext {
  apiKey: ApiKey;
  organization: {
    id: string;
  };
}

/**
 * API Key authentication middleware
 * Validates the X-API-Key header and attaches apiKey and organization to context
 */
export const apiKeyMiddleware = new Elysia({ name: "apiKey" }).derive(
  async ({ headers, set }): Promise<ApiKeyContext> => {
    const apiKeyHeader = headers["x-api-key"];

    if (!apiKeyHeader) {
      set.status = 401;
      throw new AuthenticationError("Missing X-API-Key header");
    }

    try {
      const { apiKey, organizationId } = await validateApiKey(apiKeyHeader);

      return {
        apiKey,
        organization: {
          id: organizationId,
        },
      };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        set.status = 401;
        throw error;
      }
      set.status = 401;
      throw new AuthenticationError("Invalid API key");
    }
  }
);

/**
 * Optional API key middleware - doesn't throw if no key provided
 */
export const optionalApiKeyMiddleware = new Elysia({
  name: "optionalApiKey",
}).derive(
  async ({ headers }): Promise<{ apiKey: ApiKey | null; organization: { id: string } | null }> => {
    const apiKeyHeader = headers["x-api-key"];

    if (!apiKeyHeader) {
      return { apiKey: null, organization: null };
    }

    try {
      const { apiKey, organizationId } = await validateApiKey(apiKeyHeader);

      return {
        apiKey,
        organization: {
          id: organizationId,
        },
      };
    } catch {
      return { apiKey: null, organization: null };
    }
  }
);

/**
 * Require specific scope for API key
 */
export function requireScope(scope: string) {
  return new Elysia({ name: `requireScope:${scope}` }).derive(
    async ({ store, set }): Promise<void> => {
      const apiKey = (store as { apiKey?: ApiKey }).apiKey;

      if (!apiKey) {
        set.status = 401;
        throw new AuthenticationError("API key required");
      }

      // Deny access when no scopes are defined
      if (!apiKey.scopes || apiKey.scopes.length === 0) {
        set.status = 403;
        throw new AuthorizationError(
          "API key has no scopes defined. At least one scope is required."
        );
      }

      if (!apiKey.scopes.includes(scope)) {
        set.status = 403;
        throw new AuthorizationError(`Missing required scope: ${scope}`);
      }
    }
  );
}

/**
 * Hybrid authentication middleware
 * Accepts either Bearer token or API key
 */
export const hybridAuthMiddleware = new Elysia({ name: "hybridAuth" }).derive(
  async ({
    headers,
    set,
  }): Promise<{
    authType: "jwt" | "apiKey";
    user?: { id: string; email: string };
    apiKey?: ApiKey;
    organization?: { id: string };
  }> => {
    const authorization = headers.authorization;
    const apiKeyHeader = headers["x-api-key"];

    // Try JWT first
    if (authorization?.startsWith("Bearer ")) {
      const token = authorization.slice(7);
      try {
        const { verifyAccessToken } = await import("../lib/jwt");
        const payload = await verifyAccessToken(token);
        return {
          authType: "jwt" as const,
          user: { id: payload.userId, email: payload.email },
        };
      } catch {
        // Fall through to try API key
      }
    }

    // Try API key
    if (apiKeyHeader) {
      try {
        const { apiKey, organizationId } = await validateApiKey(apiKeyHeader);

        return {
          authType: "apiKey",
          apiKey,
          organization: { id: organizationId },
        };
      } catch (error) {
        set.status = 401;
        throw new AuthenticationError("Invalid API key");
      }
    }

    set.status = 401;
    throw new AuthenticationError("Missing authentication credentials");
  }
);
