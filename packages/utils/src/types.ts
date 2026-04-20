/**
 * Common TypeScript types and interfaces
 */

/**
 * Pagination metadata
 */
export interface Pagination {
  /** Current page number (1-indexed) */
  page: number;

  /** Number of items per page */
  limit: number;

  /** Total number of items across all pages */
  total: number;

  /** Total number of pages */
  totalPages: number;

  /** Whether there is a next page */
  hasNext: boolean;

  /** Whether there is a previous page */
  hasPrev: boolean;
}

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  data: T[];

  /** Pagination metadata */
  pagination: Pagination;
}

/**
 * Standard API success response
 */
export interface ApiResponse<T = unknown> {
  /** Response data */
  data: T;

  /** Success message (optional) */
  message?: string;

  /** Response metadata (optional) */
  meta?: Record<string, unknown>;
}

/**
 * Standard API error response
 */
export interface ApiErrorResponse {
  error: {
    /** Error code (e.g., "VALIDATION_ERROR") */
    code: string;

    /** Human-readable error message */
    message: string;

    /** HTTP status code */
    statusCode: number;

    /** Additional error details (optional) */
    details?: Record<string, unknown>;

    /** Validation errors (optional) */
    validation?: ValidationError[];

    /** Stack trace (only in development) */
    stack?: string;
  };
}

/**
 * Validation error detail
 */
export interface ValidationError {
  /** Field name that failed validation */
  field: string;

  /** Validation error message */
  message: string;

  /** Value that failed validation */
  value?: unknown;

  /** Validation rule that failed */
  rule?: string;
}

/**
 * Database record with common timestamp fields
 */
export interface TimestampedRecord {
  /** ISO 8601 timestamp of creation */
  createdAt: string;

  /** ISO 8601 timestamp of last update */
  updatedAt: string;
}

/**
 * Database record with soft delete support
 */
export interface SoftDeletableRecord extends TimestampedRecord {
  /** ISO 8601 timestamp of deletion (null if not deleted) */
  deletedAt: string | null;
}

/**
 * User session data
 */
export interface SessionData {
  /** User ID */
  userId: string;

  /** User email */
  email: string;

  /** User role */
  role: string;

  /** Session ID */
  sessionId: string;

  /** Session expiry timestamp */
  expiresAt: string;

  /** Additional session metadata */
  metadata?: Record<string, unknown>;
}

/**
 * JWT token payload
 */
export interface TokenPayload {
  /** Subject (user ID) */
  sub: string;

  /** Issued at timestamp */
  iat: number;

  /** Expiration timestamp */
  exp: number;

  /** Token type */
  type: "access" | "refresh" | "magic_link" | "email_verification" | "password_reset";

  /** Additional claims */
  [key: string]: unknown;
}

/**
 * Webhook event payload
 */
export interface WebhookEvent<T = unknown> {
  /** Event ID */
  id: string;

  /** Event type (e.g., "user.created") */
  type: string;

  /** Event data */
  data: T;

  /** Event timestamp */
  timestamp: string;

  /** API version */
  apiVersion: string;
}

/**
 * Audit log entry
 */
export interface AuditLog {
  /** Log entry ID */
  id: string;

  /** User who performed the action */
  userId: string;

  /** Action performed (e.g., "user.login") */
  action: string;

  /** Resource type affected */
  resourceType: string;

  /** Resource ID affected */
  resourceId: string;

  /** IP address of the request */
  ipAddress: string;

  /** User agent string */
  userAgent: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;

  /** Timestamp of the action */
  timestamp: string;
}

/**
 * Background job data
 */
export interface Job<T = unknown> {
  /** Job ID */
  id: string;

  /** Job type/name */
  type: string;

  /** Job payload */
  data: T;

  /** Job priority (higher = more important) */
  priority: number;

  /** Number of retry attempts */
  attempts: number;

  /** Maximum retry attempts */
  maxAttempts: number;

  /** Job status */
  status: "pending" | "processing" | "completed" | "failed" | "cancelled";

  /** Error message if failed */
  error?: string;

  /** Job result if completed */
  result?: unknown;

  /** Scheduled execution time */
  scheduledAt: string;

  /** Actual start time */
  startedAt?: string;

  /** Completion time */
  completedAt?: string;

  /** Job metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Rate limit info
 */
export interface RateLimitInfo {
  /** Maximum requests allowed */
  limit: number;

  /** Remaining requests in current window */
  remaining: number;

  /** Timestamp when limit resets */
  resetAt: string;

  /** Time until reset in seconds */
  resetIn: number;
}

/**
 * File upload metadata
 */
export interface FileMetadata {
  /** File ID */
  id: string;

  /** Original filename */
  filename: string;

  /** MIME type */
  mimeType: string;

  /** File size in bytes */
  size: number;

  /** Storage URL */
  url: string;

  /** File hash for deduplication */
  hash: string;

  /** Upload timestamp */
  uploadedAt: string;

  /** Uploader user ID */
  uploadedBy: string;

  /** Additional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Make all properties optional recursively
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Make all properties required recursively
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: T[P] extends object ? DeepRequired<T[P]> : T[P];
};

/**
 * Extract keys from type that match a specific value type
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Omit properties by value type
 */
export type OmitByType<T, V> = Omit<T, KeysOfType<T, V>>;

/**
 * Pick properties by value type
 */
export type PickByType<T, V> = Pick<T, KeysOfType<T, V>>;

/**
 * Make specific properties optional
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific properties required
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

/**
 * Nullable type (can be null or undefined)
 */
export type Nullable<T> = T | null | undefined;

/**
 * Non-nullable type (cannot be null or undefined)
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Async function type
 */
export type AsyncFunction<Args extends unknown[] = unknown[], Return = unknown> = (
  ...args: Args
) => Promise<Return>;

/**
 * Extract promise type
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
