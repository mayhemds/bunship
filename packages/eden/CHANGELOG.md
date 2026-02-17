# @bunship/eden Changelog

All notable changes to the BunShip Eden client package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-28

### Added

- Initial release of @bunship/eden package
- Type-safe API client using Elysia Eden Treaty
- Full TypeScript support with auto-complete and compile-time validation
- Core functionality:
  - `createClient()` function for creating typed API clients
  - Support for authentication headers and custom options
  - Automatic type inference from Elysia server

### Types

- `BunShipClient` - Main client type with full type inference
- `ErrorResponse` - Standard error response type
- `HealthResponse` - Health check response type
- `PaginatedResponse<T>` - Generic paginated response wrapper
- `PaginationParams` - Common pagination parameters
- `SuccessResponse<T>` - Generic success response wrapper
- `AuthResponse` - Authentication response with tokens
- `OrganizationResponse` - Organization data type
- `OrganizationMember` - Organization member type
- `ApiKeyResponse` - API key response type
- Type guards: `isErrorResponse()`, `isPaginatedResponse()`

### Utilities

- `BunShipApiError` - Custom error class with helper methods
  - `isAuthError()`, `isValidationError()`, `isRateLimitError()`
  - `isServerError()`, `isClientError()`
  - `getUserMessage()` for user-friendly error messages
- `withRetry()` - Execute requests with automatic retry and exponential backoff
- `AuthenticatedClient` - Client wrapper with automatic token management
  - Automatic token refresh on 401 errors
  - Support for memory and localStorage token storage
  - `withAuth()` method for authenticated requests
- Token storage implementations:
  - `MemoryTokenStorage` - In-memory token storage
  - `LocalStorageTokenStorage` - Browser localStorage storage
- `createRequestLogger()` - Request/response logging middleware
- `batchRequests()` - Execute multiple requests concurrently
- `unwrapResponse()` - Safely extract data from responses

### Documentation

- Comprehensive README with usage examples
- Example file demonstrating common patterns
- Test suite with type safety examples
- JSDoc comments for all public APIs

### Examples

- Basic client usage
- Authentication flow (login, logout, refresh)
- Organization management (CRUD operations)
- Error handling patterns
- Pagination support
- API key management
- Custom error handling with `BunShipApiError`
- Reusable authenticated client pattern
- Retry logic with exponential backoff
- Batch requests execution

## [Unreleased]

### Planned

- WebSocket support for real-time features
- Request/response interceptors
- Client-side caching layer
- GraphQL client support (if/when GraphQL is added to API)
- More granular type exports for specific endpoints
- Performance monitoring and analytics integration
- Request queuing and throttling utilities
- Offline support with request queueing

---

## Version History

- **1.0.0** - Initial release with core functionality
