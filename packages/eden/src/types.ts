/**
 * Common API response types for BunShip
 *
 * These types can be used for error handling and response validation
 */

/**
 * Standard error response from the API
 */
export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
}

/**
 * Health check response
 */
export interface HealthResponse {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  version?: string;
  uptime?: number;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Common pagination parameters
 */
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: "asc" | "desc";
}

/**
 * Success response wrapper
 */
export interface SuccessResponse<T = void> {
  success: true;
  data: T;
  message?: string;
}

/**
 * Authentication response with tokens
 */
export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: "Bearer";
  user: {
    id: string;
    email: string;
    name?: string;
    role: string;
  };
}

/**
 * Organization response
 */
export interface OrganizationResponse {
  id: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  members?: OrganizationMember[];
}

/**
 * Organization member
 */
export interface OrganizationMember {
  id: string;
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "member";
  joinedAt: string;
  user?: {
    id: string;
    email: string;
    name?: string;
  };
}

/**
 * API key response
 */
export interface ApiKeyResponse {
  id: string;
  name: string;
  key?: string; // Only returned on creation
  prefix: string;
  lastUsedAt?: string;
  createdAt: string;
  expiresAt?: string;
}

/**
 * Type guard to check if a response is an error
 */
export function isErrorResponse(response: unknown): response is ErrorResponse {
  return (
    typeof response === "object" &&
    response !== null &&
    "error" in response &&
    "statusCode" in response
  );
}

/**
 * Type guard to check if a response is paginated
 */
export function isPaginatedResponse<T>(response: unknown): response is PaginatedResponse<T> {
  return (
    typeof response === "object" &&
    response !== null &&
    "data" in response &&
    "pagination" in response &&
    Array.isArray((response as any).data)
  );
}
