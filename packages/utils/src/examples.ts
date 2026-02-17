/**
 * Usage examples for @bunship/utils
 * This file demonstrates how to use the utilities
 * (Not included in package exports - for documentation only)
 */

import {
  // Errors
  ValidationError,
  AuthenticationError,
  NotFoundError,
  isAppError,

  // Validators
  isValidEmail,
  isValidPassword,
  sanitizeSlug,

  // Constants
  HTTP_STATUS,
  TOKEN_EXPIRY,

  // Crypto
  generateToken,
  generateId,
  hashToken,

  // Formatters
  formatDate,
  formatCurrency,
  formatBytes,

  // Types
  type ApiResponse,
  type PaginatedResponse,
  type Pagination,
} from "./index";

// ============================================================================
// ERROR HANDLING EXAMPLES
// ============================================================================

function validateUserInput(email: string, password: string) {
  // Email validation
  if (!isValidEmail(email)) {
    throw new ValidationError("Invalid email format", {
      field: "email",
      value: email,
    });
  }

  // Password validation
  const passwordResult = isValidPassword(password, {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  });

  if (passwordResult !== true) {
    throw new ValidationError(passwordResult, {
      field: "password",
    });
  }
}

function authenticateUser(token: string | null) {
  if (!token) {
    throw new AuthenticationError("No authentication token provided");
  }

  // Verify token logic...
  const isValid = false; // Placeholder

  if (!isValid) {
    throw new AuthenticationError("Invalid or expired token");
  }
}

function findUser(userId: string) {
  const user = null; // Database lookup placeholder

  if (!user) {
    throw new NotFoundError("User", { userId });
  }

  return user;
}

function handleError(error: unknown) {
  if (isAppError(error)) {
    console.error(`[${error.code}] ${error.message}`, {
      statusCode: error.statusCode,
      details: error.details,
    });

    // Return standardized error response
    return error.toJSON();
  }

  // Unknown error - log and return generic error
  console.error("Unknown error:", error);
  return {
    error: {
      code: "INTERNAL_ERROR",
      message: "An unexpected error occurred",
      statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR,
    },
  };
}

// ============================================================================
// SLUG GENERATION EXAMPLES
// ============================================================================

function createPostSlug(title: string): string {
  // Convert title to URL-friendly slug
  const baseSlug = sanitizeSlug(title);

  // Add unique suffix to prevent conflicts
  const uniqueId = generateId();
  const shortId = uniqueId.slice(-8);

  return `${baseSlug}-${shortId}`;
}

// Examples:
// createPostSlug("Hello World!") → "hello-world-xj9k2l4m"
// createPostSlug("Café & Restaurant Guide") → "cafe-restaurant-guide-p5n8q2k1"

// ============================================================================
// TOKEN GENERATION EXAMPLES
// ============================================================================

async function createPasswordResetToken(userId: string) {
  // Generate secure random token
  const token = generateToken();

  // Hash for database storage
  const hashedToken = await hashToken(token);

  // Calculate expiry
  const expiresAt = new Date(Date.now() + TOKEN_EXPIRY.PASSWORD_RESET);

  // Store in database (placeholder)
  await storeToken({
    userId,
    token: hashedToken,
    type: "password_reset",
    expiresAt,
  });

  // Return unhashed token to send to user (only time it's available)
  return token;
}

async function verifyPasswordResetToken(inputToken: string) {
  // Hash the input token
  const hashedInput = await hashToken(inputToken);

  // Look up in database (placeholder)
  const storedToken = await findToken(hashedInput);

  if (!storedToken) {
    throw new ValidationError("Invalid or expired token");
  }

  if (new Date() > new Date(storedToken.expiresAt)) {
    throw new ValidationError("Token has expired");
  }

  return storedToken;
}

// ============================================================================
// FORMATTING EXAMPLES
// ============================================================================

function formatInvoice(invoice: {
  amountCents: number;
  currency: string;
  createdAt: Date;
  fileSizeBytes: number;
}) {
  return {
    amount: formatCurrency(invoice.amountCents, invoice.currency),
    date: formatDate(invoice.createdAt, "medium"),
    fileSize: formatBytes(invoice.fileSizeBytes),
  };
}

// Example output:
// {
//   amount: "$19.99",
//   date: "Jan 28, 2026",
//   fileSize: "245.5 KB"
// }

function formatActivityFeed(activities: Array<{ type: string; timestamp: Date }>) {
  return activities.map((activity) => ({
    ...activity,
    timeAgo: formatDate(activity.timestamp, "relative"),
  }));
}

// Example output:
// [
//   { type: "login", timestamp: Date, timeAgo: "2 hours ago" },
//   { type: "update_profile", timestamp: Date, timeAgo: "yesterday" }
// ]

// ============================================================================
// API RESPONSE EXAMPLES
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}

function createSuccessResponse<T>(data: T, message?: string): ApiResponse<T> {
  const response: ApiResponse<T> = { data };
  if (message !== undefined) {
    response.message = message;
  }
  return response;
}

function createPaginatedResponse<T>(
  items: T[],
  page: number,
  limit: number,
  total: number
): PaginatedResponse<T> {
  const totalPages = Math.ceil(total / limit);

  const pagination: Pagination = {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };

  return {
    data: items,
    pagination,
  };
}

// Example usage:
async function getUsersEndpoint(page = 1, limit = 20) {
  // Fetch users from database (placeholder)
  const users: User[] = [];
  const total = 100;

  // Return paginated response
  return createPaginatedResponse(users, page, limit, total);
}

// Example output:
// {
//   data: [...users...],
//   pagination: {
//     page: 1,
//     limit: 20,
//     total: 100,
//     totalPages: 5,
//     hasNext: true,
//     hasPrev: false
//   }
// }

// ============================================================================
// PLACEHOLDER FUNCTIONS (for examples)
// ============================================================================

async function storeToken(data: { userId: string; token: string; type: string; expiresAt: Date }) {
  // Database operation placeholder
  console.log("Storing token:", data);
}

async function findToken(hashedToken: string) {
  // Database lookup placeholder
  return null as any;
}
