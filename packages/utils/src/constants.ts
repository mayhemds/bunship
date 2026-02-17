/**
 * Application-wide constants
 */

/**
 * HTTP status codes
 * Commonly used status codes for API responses
 */
export const HTTP_STATUS = {
  // Success
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,

  // Client Errors
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,

  // Server Errors
  INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
} as const;

export type HttpStatus = (typeof HTTP_STATUS)[keyof typeof HTTP_STATUS];

/**
 * Token expiry times in milliseconds
 */
export const TOKEN_EXPIRY = {
  /** Email verification token - 24 hours */
  EMAIL_VERIFICATION: 24 * 60 * 60 * 1000,

  /** Password reset token - 1 hour */
  PASSWORD_RESET: 60 * 60 * 1000,

  /** Team invitation token - 7 days */
  INVITATION: 7 * 24 * 60 * 60 * 1000,

  /** Magic link token - 15 minutes */
  MAGIC_LINK: 15 * 60 * 1000,

  /** API key rotation grace period - 30 days */
  API_KEY_ROTATION: 30 * 24 * 60 * 60 * 1000,

  /** Session token - 7 days */
  SESSION: 7 * 24 * 60 * 60 * 1000,

  /** Remember me session - 30 days */
  REMEMBER_ME: 30 * 24 * 60 * 60 * 1000,
} as const;

export type TokenExpiry = (typeof TOKEN_EXPIRY)[keyof typeof TOKEN_EXPIRY];

/**
 * Rate limit configurations
 */
export const RATE_LIMITS = {
  /** Default API rate limit per IP */
  API_PER_IP: {
    requests: 100,
    window: 60 * 1000, // 1 minute
  },

  /** Authentication endpoints (login, register) */
  AUTH: {
    requests: 5,
    window: 15 * 60 * 1000, // 15 minutes
  },

  /** Password reset requests */
  PASSWORD_RESET: {
    requests: 3,
    window: 60 * 60 * 1000, // 1 hour
  },

  /** Email verification resend */
  EMAIL_VERIFICATION: {
    requests: 3,
    window: 60 * 60 * 1000, // 1 hour
  },
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  /** Default page size */
  DEFAULT_LIMIT: 20,

  /** Maximum page size */
  MAX_LIMIT: 100,

  /** Minimum page size */
  MIN_LIMIT: 1,

  /** Default page number */
  DEFAULT_PAGE: 1,
} as const;

/**
 * User roles
 */
export const USER_ROLES = {
  ADMIN: "admin",
  USER: "user",
  GUEST: "guest",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

/**
 * API Key prefixes for identification
 */
export const API_KEY_PREFIXES = {
  /** Production API keys */
  PRODUCTION: "pk_",

  /** Test/development API keys */
  TEST: "sk_",
} as const;

/**
 * Password validation defaults
 */
export const PASSWORD_REQUIREMENTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 128,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBERS: true,
  REQUIRE_SPECIAL_CHARS: false,
} as const;

/**
 * Environment types
 */
export const ENVIRONMENTS = {
  DEVELOPMENT: "development",
  STAGING: "staging",
  PRODUCTION: "production",
  TEST: "test",
} as const;

export type Environment = (typeof ENVIRONMENTS)[keyof typeof ENVIRONMENTS];

/**
 * Cache TTL values in seconds
 */
export const CACHE_TTL = {
  /** Short-lived cache (5 minutes) */
  SHORT: 5 * 60,

  /** Medium cache (1 hour) */
  MEDIUM: 60 * 60,

  /** Long cache (24 hours) */
  LONG: 24 * 60 * 60,

  /** Very long cache (7 days) */
  VERY_LONG: 7 * 24 * 60 * 60,
} as const;

/**
 * File upload limits
 */
export const UPLOAD_LIMITS = {
  /** Maximum file size in bytes (10 MB) */
  MAX_FILE_SIZE: 10 * 1024 * 1024,

  /** Maximum number of files per upload */
  MAX_FILES: 10,

  /** Allowed MIME types for images */
  ALLOWED_IMAGE_TYPES: [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/svg+xml",
  ] as const,

  /** Allowed MIME types for documents */
  ALLOWED_DOCUMENT_TYPES: [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
  ] as const,
} as const;
