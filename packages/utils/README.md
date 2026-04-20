# @bunship/utils

Shared utilities package for BunShip - the Bun + Elysia SaaS boilerplate.

## Overview

This package provides essential utilities used across the BunShip platform, including error handling, validation, formatting, cryptographic functions, and TypeScript types.

## Installation

This is an internal workspace package. Import it in other packages:

```typescript
import { generateToken, ValidationError, formatDate } from "@bunship/utils";
```

## Modules

### Error Classes (`errors.ts`)

Custom error classes with consistent structure and HTTP status codes:

```typescript
import { ValidationError, AuthenticationError, NotFoundError, isAppError } from "@bunship/utils";

// Throw validation error
throw new ValidationError("Invalid email format", {
  field: "email",
  value: userInput,
});

// Throw authentication error
throw new AuthenticationError("Invalid credentials");

// Throw not found error
throw new NotFoundError("User");

// Check if error is AppError
if (isAppError(error)) {
  console.log(error.statusCode, error.code);
}
```

Available error classes:

- `AppError` - Base error class (don't use directly)
- `ValidationError` - 400, `VALIDATION_ERROR`
- `AuthenticationError` - 401, `AUTHENTICATION_ERROR`
- `AuthorizationError` - 403, `AUTHORIZATION_ERROR`
- `NotFoundError` - 404, `NOT_FOUND`
- `ConflictError` - 409, `CONFLICT`
- `RateLimitError` - 429, `RATE_LIMIT_EXCEEDED`
- `InternalError` - 500, `INTERNAL_ERROR`

### Validators (`validators.ts`)

Input validation utilities:

```typescript
import { isValidEmail, isValidPassword, sanitizeSlug, isValidUrl } from "@bunship/utils";

// Email validation
if (!isValidEmail("user@example.com")) {
  throw new ValidationError("Invalid email");
}

// Password validation with custom rules
const result = isValidPassword("MyP@ssw0rd", {
  minLength: 10,
  requireSpecialChars: true,
});
if (result !== true) {
  throw new ValidationError(result); // result is error message
}

// Sanitize slug
const slug = sanitizeSlug("Hello World!"); // "hello-world"

// URL validation
if (isValidUrl("https://example.com")) {
  // Valid URL
}
```

Available validators:

- `isValidEmail(email)` - Email format validation
- `isValidSlug(slug)` - URL-friendly slug validation
- `isValidPassword(password, config)` - Password strength validation
- `isValidUrl(url)` - URL format validation
- `sanitizeSlug(text)` - Convert text to valid slug
- `isNonEmptyString(value)` - Check if non-empty string
- `isPositiveInteger(value)` - Check if positive integer
- `isInRange(value, min, max)` - Check if number in range
- `isValidLength(text, min, max)` - Check string length

### Constants (`constants.ts`)

Application-wide constants:

```typescript
import { HTTP_STATUS, TOKEN_EXPIRY, PAGINATION, USER_ROLES } from "@bunship/utils";

// HTTP status codes
return new Response(data, { status: HTTP_STATUS.CREATED });

// Token expiry times
const expiresAt = Date.now() + TOKEN_EXPIRY.EMAIL_VERIFICATION;

// Pagination defaults
const limit = Math.min(userLimit, PAGINATION.MAX_LIMIT);

// User roles
if (user.role === USER_ROLES.ADMIN) {
  // Admin access
}
```

Available constants:

- `HTTP_STATUS` - HTTP status codes (OK, CREATED, BAD_REQUEST, etc.)
- `TOKEN_EXPIRY` - Token expiry times in milliseconds
- `RATE_LIMITS` - Rate limit configurations
- `PAGINATION` - Pagination defaults (limit, max, etc.)
- `USER_ROLES` - User role constants
- `API_KEY_PREFIXES` - API key prefix formats
- `PASSWORD_REQUIREMENTS` - Password validation defaults
- `ENVIRONMENTS` - Environment type constants
- `CACHE_TTL` - Cache TTL values
- `UPLOAD_LIMITS` - File upload limits

### Crypto Utilities (`crypto.ts`)

Cryptographic functions for secure token generation:

```typescript
import { generateToken, generateId, hashToken, generateApiKey, generateOTP } from "@bunship/utils";

// Generate secure random token
const token = generateToken(); // 32-byte base64url string

// Generate unique ID (CUID2)
const id = generateId(); // "clxyz123..."

// Hash token for storage
const hash = await hashToken(token);

// Generate API key with prefix
const apiKey = generateApiKey("pk"); // "pk_abc12345_..."

// Generate 6-digit OTP
const otp = generateOTP(6); // "123456"

// Timing-safe string comparison
if (timingSafeEqual(inputToken, storedToken)) {
  // Tokens match
}
```

Available functions:

- `generateToken(byteLength?)` - Secure random token
- `generateId()` - CUID2 unique identifier
- `hashToken(token)` - SHA-256 hash
- `generateApiKeyPrefix()` - Random 8-char prefix
- `generateApiKey(prefix)` - Full API key
- `generateOTP(length)` - Numeric OTP
- `randomInt(min, max)` - Secure random integer
- `generateRandomString(length)` - Random alphanumeric
- `timingSafeEqual(a, b)` - Constant-time comparison

### Formatters (`formatters.ts`)

Data formatting utilities:

```typescript
import { formatDate, formatCurrency, formatBytes, truncate, slugify } from "@bunship/utils";

// Format dates
formatDate(new Date(), "short"); // "1/28/26"
formatDate(new Date(), "medium"); // "Jan 28, 2026"
formatDate(new Date(), "long"); // "January 28, 2026, 3:45 PM"
formatDate(new Date(), "relative"); // "2 hours ago"

// Format currency (amount in cents)
formatCurrency(1999, "USD"); // "$19.99"
formatCurrency(5000, "EUR", "de-DE"); // "50,00 €"

// Format bytes
formatBytes(1536); // "1.50 KB"
formatBytes(1048576); // "1.00 MB"

// Truncate text
truncate("Long text here", 10); // "Long te..."

// Slugify text
slugify("Hello World!"); // "hello-world"
```

Available formatters:

- `formatDate(date, format, locale)` - Date formatting
- `formatRelativeTime(date)` - Relative time ("2 hours ago")
- `formatCurrency(amount, currency, locale)` - Currency formatting
- `formatBytes(bytes, decimals)` - File size formatting
- `truncate(text, maxLength, ellipsis)` - Text truncation
- `slugify(text)` - URL-friendly slug
- `formatNumber(num, locale)` - Number with separators
- `formatPercentage(value, decimals)` - Percentage formatting
- `formatDuration(ms)` - Duration formatting
- `capitalize(text)` - Capitalize first letter
- `titleCase(text)` - Title case conversion
- `pluralize(count, singular, plural)` - Word pluralization

### TypeScript Types (`types.ts`)

Common type definitions:

```typescript
import type {
  ApiResponse,
  PaginatedResponse,
  Pagination,
  SessionData,
  TokenPayload,
} from "@bunship/utils";

// API response wrapper
const response: ApiResponse<User> = {
  data: user,
  message: "User created successfully",
};

// Paginated response
const users: PaginatedResponse<User> = {
  data: userArray,
  pagination: {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5,
    hasNext: true,
    hasPrev: false,
  },
};

// Session data
const session: SessionData = {
  userId: "user_123",
  email: "user@example.com",
  role: "admin",
  sessionId: "sess_xyz",
  expiresAt: new Date().toISOString(),
};
```

Available types:

- `Pagination` - Pagination metadata
- `PaginatedResponse<T>` - Paginated data wrapper
- `ApiResponse<T>` - Success response
- `ApiErrorResponse` - Error response
- `ValidationErrorDetail` - Validation error structure
- `TimestampedRecord` - Records with timestamps
- `SoftDeletableRecord` - Soft delete support
- `SessionData` - User session data
- `TokenPayload` - JWT token payload
- `WebhookEvent<T>` - Webhook event structure
- `AuditLog` - Audit log entry
- `Job<T>` - Background job data
- `RateLimitInfo` - Rate limit information
- `FileMetadata` - File upload metadata
- Utility types: `DeepPartial`, `DeepRequired`, `PartialBy`, `RequiredBy`, etc.

## Development

### Type Checking

```bash
bun run typecheck
```

### Linting

```bash
bun run lint
```

## Design Principles

1. **Type Safety**: All utilities are strictly typed with no `any` types
2. **Security First**: Cryptographic functions use secure randomness and timing-safe comparisons
3. **Validation**: Input validation with clear error messages
4. **Consistency**: Standardized error handling and response formats
5. **Developer Experience**: Clear function names, JSDoc comments, and comprehensive types

## Usage in Other Packages

This package is used throughout BunShip:

```typescript
// In API routes
import { ValidationError, HTTP_STATUS } from "@bunship/utils";

export async function POST(request: Request) {
  try {
    // Your logic
    return new Response(data, { status: HTTP_STATUS.CREATED });
  } catch (error) {
    if (error instanceof ValidationError) {
      return new Response(error.toJSON(), {
        status: error.statusCode,
      });
    }
  }
}

// In services
import { generateToken, hashToken } from "@bunship/utils";

const token = generateToken();
const hash = await hashToken(token);
await db.insert({ token: hash });

// In formatters
import { formatCurrency, formatDate } from "@bunship/utils";

const invoice = {
  amount: formatCurrency(totalCents, "USD"),
  date: formatDate(createdAt, "medium"),
};
```

## License

MIT
