/**
 * Custom error classes for the BunShip API
 * Provides structured error handling with status codes and error codes
 */

/**
 * Base application error class
 * All custom errors extend this class
 */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly code: string,
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to JSON-serializable format
   */
  toJSON() {
    return {
      error: {
        name: this.name,
        message: this.message,
        code: this.code,
        statusCode: this.statusCode,
        ...(this.details && { details: this.details }),
      },
    };
  }
}

/**
 * Validation error - 400 Bad Request
 * Used when input validation fails
 */
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, "VALIDATION_ERROR", details);
  }
}

/**
 * Authentication error - 401 Unauthorized
 * Used when user is not authenticated
 */
export class AuthenticationError extends AppError {
  constructor(message = "Authentication required", details?: Record<string, unknown>) {
    super(message, 401, "AUTHENTICATION_ERROR", details);
  }
}

/**
 * Authorization error - 403 Forbidden
 * Used when user lacks permission for the requested action
 */
export class AuthorizationError extends AppError {
  constructor(message = "Insufficient permissions", details?: Record<string, unknown>) {
    super(message, 403, "AUTHORIZATION_ERROR", details);
  }
}

/**
 * Not found error - 404 Not Found
 * Used when a requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(resource = "Resource", details?: Record<string, unknown>) {
    super(`${resource} not found`, 404, "NOT_FOUND", details);
  }
}

/**
 * Conflict error - 409 Conflict
 * Used when a resource already exists or action conflicts with current state
 */
export class ConflictError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 409, "CONFLICT", details);
  }
}

/**
 * Rate limit error - 429 Too Many Requests
 * Used when rate limit is exceeded
 */
export class RateLimitError extends AppError {
  constructor(
    message = "Rate limit exceeded. Please try again later.",
    details?: Record<string, unknown>
  ) {
    super(message, 429, "RATE_LIMIT_EXCEEDED", details);
  }
}

/**
 * Internal server error - 500 Internal Server Error
 * Used for unexpected server errors
 */
export class InternalError extends AppError {
  constructor(message = "An unexpected error occurred", details?: Record<string, unknown>) {
    super(message, 500, "INTERNAL_ERROR", details);
  }
}

/**
 * Check if an error is an instance of AppError
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

/**
 * Convert any error to AppError format
 * Useful for standardizing error handling
 */
export function toAppError(error: unknown): AppError {
  if (isAppError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message, {
      originalError: error.name,
    });
  }

  return new InternalError("An unknown error occurred");
}
