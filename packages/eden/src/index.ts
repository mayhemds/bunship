import { treaty } from "@elysiajs/eden";
import type { App } from "../../../apps/api/src";

/**
 * Create a type-safe BunShip API client
 *
 * @param baseUrl - The API base URL (e.g., "http://localhost:3000")
 * @param options - Optional configuration for the client
 * @returns A fully typed Eden client for the BunShip API
 *
 * @example
 * ```typescript
 * import { createClient } from "@bunship/eden";
 *
 * const client = createClient("http://localhost:3000");
 *
 * // Fully typed API calls
 * const health = await client.health.get();
 * console.log(health.data); // { status: "ok", timestamp: "..." }
 *
 * // With authentication
 * const authClient = createClient("http://localhost:3000", {
 *   headers: { Authorization: `Bearer ${token}` }
 * });
 * ```
 */
export function createClient(baseUrl: string, options?: RequestInit) {
  return treaty<App>(baseUrl, options);
}

// Re-export the App type for advanced usage
export type { App };

/**
 * The BunShip API client type with full type inference
 */
export type BunShipClient = ReturnType<typeof createClient>;

// Re-export common types
export type {
  ErrorResponse,
  HealthResponse,
  PaginatedResponse,
  PaginationParams,
  SuccessResponse,
  AuthResponse,
  OrganizationResponse,
  OrganizationMember,
  ApiKeyResponse,
} from "./types";

// Re-export type guards
export { isErrorResponse, isPaginatedResponse } from "./types";

// Re-export utilities
export {
  BunShipApiError,
  withRetry,
  AuthenticatedClient,
  MemoryTokenStorage,
  LocalStorageTokenStorage,
  createRequestLogger,
  batchRequests,
  unwrapResponse,
} from "./utils";

export type { RetryConfig, TokenStorage } from "./utils";
