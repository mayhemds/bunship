/**
 * @bunship/utils - Shared utilities for BunShip
 *
 * This package provides common utilities used across the BunShip platform:
 * - Error classes for consistent error handling
 * - Validation utilities for input validation
 * - Constants for HTTP status codes, token expiry, etc.
 * - Crypto utilities for secure token generation
 * - Formatters for dates, currency, bytes, etc.
 * - TypeScript types for API responses and common data structures
 */

// Error classes
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  InternalError,
  isAppError,
  toAppError,
} from "./errors";

// Validators
export {
  emailRegex,
  slugRegex,
  urlRegex,
  isValidEmail,
  isValidSlug,
  isValidPassword,
  isValidUrl,
  sanitizeSlug,
  isNonEmptyString,
  isPositiveInteger,
  isInRange,
  isValidLength,
  type PasswordConfig,
} from "./validators";

// Constants
export {
  HTTP_STATUS,
  TOKEN_EXPIRY,
  RATE_LIMITS,
  PAGINATION,
  USER_ROLES,
  API_KEY_PREFIXES,
  PASSWORD_REQUIREMENTS,
  ENVIRONMENTS,
  CACHE_TTL,
  UPLOAD_LIMITS,
  type HttpStatus,
  type TokenExpiry,
  type UserRole,
  type Environment,
} from "./constants";

// Crypto utilities
export {
  generateToken,
  generateId,
  hashToken,
  generateApiKeyPrefix,
  generateApiKey,
  generateOTP,
  randomInt,
  generateRandomString,
  timingSafeEqual,
} from "./crypto";

// Formatters
export {
  formatDate,
  formatRelativeTime,
  formatCurrency,
  formatBytes,
  truncate,
  slugify,
  formatNumber,
  formatPercentage,
  formatDuration,
  capitalize,
  titleCase,
  pluralize,
  type DateFormat,
} from "./formatters";

// Types
export type {
  Pagination,
  PaginatedResponse,
  ApiResponse,
  ApiErrorResponse,
  ValidationError as ValidationErrorDetail,
  TimestampedRecord,
  SoftDeletableRecord,
  SessionData,
  TokenPayload,
  WebhookEvent,
  AuditLog,
  Job,
  RateLimitInfo,
  FileMetadata,
  DeepPartial,
  DeepRequired,
  KeysOfType,
  OmitByType,
  PickByType,
  PartialBy,
  RequiredBy,
  Nullable,
  AsyncFunction,
  Awaited,
} from "./types";
