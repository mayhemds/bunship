# @bunship/eden - Package Summary

This document provides an overview of the Eden client package structure and contents.

## Package Structure

```
packages/eden/
├── src/
│   ├── index.ts              # Main entry point with createClient()
│   ├── types.ts              # TypeScript type definitions
│   ├── utils.ts              # Utility functions and helpers
│   ├── example.ts            # Example usage patterns
│   └── __tests__/
│       └── client.test.ts    # Test suite
├── package.json              # Package configuration
├── tsconfig.json             # TypeScript configuration
├── .gitignore                # Git ignore rules
├── README.md                 # Comprehensive documentation (11.7 KB)
├── QUICKSTART.md             # Quick start guide
├── CHANGELOG.md              # Version history
└── PACKAGE_SUMMARY.md        # This file
```

## Core Files

### 1. `src/index.ts` (Main Entry Point)

**Exports:**

- `createClient(baseUrl, options?)` - Create type-safe API client
- `BunShipClient` - Client type with full inference
- `App` - Re-exported Elysia app type
- All types from `types.ts`
- All utilities from `utils.ts`

**Key Features:**

- Type-safe client creation using Elysia Eden Treaty
- Support for custom headers and fetch options
- Full TypeScript inference from server types

### 2. `src/types.ts` (Type Definitions)

**Exports:**

- `ErrorResponse` - Standard error response structure
- `HealthResponse` - Health check response
- `PaginatedResponse<T>` - Generic paginated wrapper
- `PaginationParams` - Common pagination parameters
- `SuccessResponse<T>` - Generic success wrapper
- `AuthResponse` - Authentication with tokens
- `OrganizationResponse` - Organization data
- `OrganizationMember` - Organization member
- `ApiKeyResponse` - API key data
- `isErrorResponse()` - Type guard for errors
- `isPaginatedResponse()` - Type guard for pagination

**Purpose:**

- Provides type safety for common API responses
- Enables compile-time validation
- Type guards for runtime type checking

### 3. `src/utils.ts` (Utilities)

**Exports:**

#### Error Handling

- `BunShipApiError` - Custom error class with helpers:
  - `fromResponse()` - Create from API error
  - `isAuthError()`, `isValidationError()`, etc.
  - `getUserMessage()` - Get user-friendly message
  - `toJSON()` - Serialize to JSON

#### Retry Logic

- `withRetry()` - Execute with automatic retry
- `RetryConfig` - Configuration interface
- Features: exponential backoff, configurable retry conditions

#### Authentication

- `AuthenticatedClient` - Manages auth automatically:
  - `login()`, `logout()` - Auth operations
  - `refreshToken()` - Manual token refresh
  - `withAuth()` - Auto-refresh on 401
  - `getClient()` - Get current client
  - `isAuthenticated()` - Check auth status

#### Token Storage

- `TokenStorage` - Interface for token storage
- `MemoryTokenStorage` - In-memory storage
- `LocalStorageTokenStorage` - Browser localStorage

#### Other Utilities

- `createRequestLogger()` - Request/response logging
- `batchRequests()` - Concurrent request execution
- `unwrapResponse()` - Extract data or throw error

### 4. `src/example.ts` (Examples)

**Contents:**

- Basic client usage
- Authentication flow
- Organization management (CRUD)
- Error handling patterns
- Pagination examples
- API key management
- Reusable client patterns (ApiClientManager)
- Custom error handling (ApiError class)

**Purpose:**

- Reference implementation for common patterns
- Copy-paste ready code examples
- Best practices demonstration

### 5. `src/__tests__/client.test.ts` (Tests)

**Test Coverage:**

- Basic endpoint calls (root, health)
- Type safety verification
- Authentication flow (register, login, logout, refresh)
- Organization CRUD operations
- Error handling (validation, rate limiting, network)
- Custom headers
- Pagination parameters

**Purpose:**

- Validates functionality
- Demonstrates type safety
- Provides integration test examples
- Serves as living documentation

## Documentation Files

### README.md (Comprehensive Guide)

**Sections:**

1. Features overview
2. Installation instructions
3. Quick start guide
4. Authentication examples
5. Organization management
6. Error handling patterns
7. Pagination support
8. API key management
9. TypeScript benefits (autocomplete, inference, validation)
10. Advanced usage (custom headers, fetch options, etc.)
11. Best practices
12. Migration from fetch/axios

**Length:** ~11,950 bytes (comprehensive)

### QUICKSTART.md (5-Minute Guide)

**Sections:**

1. Installation
2. Basic usage (3 steps)
3. Common patterns
4. Common operations (cheat sheet)
5. Pro tips

**Purpose:** Get developers productive immediately

### CHANGELOG.md (Version History)

**Contents:**

- v1.0.0 initial release notes
- Complete feature list
- Planned features for future versions
- Follows Keep a Changelog format

## Configuration Files

### package.json

**Key Fields:**

- Name: `@bunship/eden`
- Version: `1.0.0`
- Type: `module` (ESM)
- Main export: `./src/index.ts`
- Additional export: `./types` for direct type imports
- Dependencies: `@elysiajs/eden@^1.0.0`
- Peer dependencies: `elysia@^1.0.0`

**Scripts:**

- `typecheck` - TypeScript type checking
- `lint` - ESLint validation
- `clean` - Remove build artifacts

### tsconfig.json

**Configuration:**

- Extends root `tsconfig.json`
- Output directory: `./dist`
- Root directory: `./src`
- Includes all files in `src/`

## Key Features Summary

### 1. Type Safety

- End-to-end type inference from Elysia server
- Compile-time validation of all API calls
- Auto-complete for endpoints, methods, parameters
- Type guards for runtime checks

### 2. Developer Experience

- Intuitive API matching server structure
- Comprehensive error messages
- Detailed documentation with examples
- Quick start guide for rapid onboarding

### 3. Production Ready

- Custom error handling with BunShipApiError
- Automatic retry with exponential backoff
- Token management with auto-refresh
- Request logging and monitoring hooks
- Batch request support

### 4. Flexible Architecture

- Pluggable token storage (memory, localStorage, custom)
- Configurable retry behavior
- Custom headers and fetch options
- Works in both browser and Node.js/Bun environments

### 5. Testing

- Comprehensive test suite
- Examples for all major features
- Type safety validation tests
- Integration test patterns

## Usage Patterns

### Pattern 1: Simple Client

```typescript
import { createClient } from "@bunship/eden";
const client = createClient("http://localhost:3000");
const result = await client.health.get();
```

### Pattern 2: Authenticated Requests

```typescript
const authClient = createClient(url, {
  headers: { Authorization: `Bearer ${token}` },
});
```

### Pattern 3: Auto-Refresh Client

```typescript
import { AuthenticatedClient } from "@bunship/eden";
const auth = new AuthenticatedClient(url);
await auth.login(email, password);
const data = await auth.withAuth((c) => c.organizations.get());
```

### Pattern 4: Error Handling

```typescript
import { BunShipApiError, unwrapResponse } from "@bunship/eden";
try {
  const data = unwrapResponse(await client.login.post({ ... }));
} catch (error) {
  if (error instanceof BunShipApiError) {
    console.log(error.getUserMessage());
  }
}
```

### Pattern 5: Retry Logic

```typescript
import { withRetry } from "@bunship/eden";
const data = await withRetry(() => client.organizations.get(), {
  maxRetries: 3,
  initialDelay: 1000,
});
```

## Integration Points

### With BunShip API

- Imports `App` type from `apps/api/src/index.ts`
- Provides type-safe interface to all API endpoints
- Automatically reflects API changes via TypeScript

### With Other Packages

- Can use `@bunship/database` types for data models
- Can use `@bunship/utils` for shared utilities
- Standalone package with minimal dependencies

### With Client Applications

- Next.js applications (app router, pages router)
- React/Vue/Svelte SPAs
- Node.js/Bun server-side applications
- React Native mobile apps

## Performance Considerations

### Client Size

- Minimal runtime overhead
- Tree-shakeable exports
- No heavy dependencies
- TypeScript types don't affect bundle size

### Runtime Performance

- Direct HTTP calls (no unnecessary abstraction)
- Optional request batching for concurrent calls
- Configurable retry with backoff
- Client-side caching capability (via utilities)

## Security Features

1. **Token Management**
   - Secure token storage interfaces
   - Automatic token refresh
   - Token expiration handling

2. **Error Handling**
   - No sensitive data in error messages
   - User-friendly error messages
   - Detailed errors for debugging (dev only)

3. **Type Safety**
   - Prevents invalid API calls at compile time
   - Type-safe error responses
   - No runtime surprises

## Extension Points

The package is designed to be extensible:

1. **Custom Token Storage**
   - Implement `TokenStorage` interface
   - Use with `AuthenticatedClient`

2. **Custom Error Handling**
   - Extend `BunShipApiError`
   - Add custom error types

3. **Request Interceptors**
   - Use `createRequestLogger` as template
   - Add custom middleware

4. **Response Transformers**
   - Wrap `createClient`
   - Transform responses before return

## Dependencies

### Production

- `@elysiajs/eden@^1.0.0` - Eden Treaty client

### Peer Dependencies

- `elysia@^1.0.0` - Elysia framework types

### Development

- `typescript@^5.4.0` - Type checking

### No External Runtime Dependencies

- All utilities are self-contained
- No lodash, axios, or other heavy libraries
- Minimal bundle size impact

## Future Roadmap

Based on CHANGELOG.md, planned features include:

- WebSocket support for real-time features
- Request/response interceptors
- Client-side caching layer
- GraphQL client support (if added to API)
- Performance monitoring integration
- Request queuing and throttling
- Offline support with request queueing

## Maintenance Notes

### Adding New Endpoints

When new endpoints are added to the API:

1. No changes needed in eden package!
2. Types automatically infer from `App` type
3. Update examples if helpful

### Adding New Response Types

When adding common response types:

1. Add to `src/types.ts`
2. Export from `src/index.ts`
3. Update README examples
4. Add to CHANGELOG

### Version Bumps

Follow semantic versioning:

- **Major**: Breaking changes (rare)
- **Minor**: New features (new utilities, types)
- **Patch**: Bug fixes, docs updates

## Testing Strategy

### Unit Tests

- Test individual utilities
- Test type guards
- Test error handling

### Integration Tests

- Test against running API
- Test full auth flow
- Test CRUD operations

### Type Tests

- Verify type inference works
- Test compile-time validation
- Test type guard accuracy

## Documentation Standards

All public APIs must have:

1. JSDoc comments with description
2. `@param` tags for parameters
3. `@returns` tag for return value
4. `@example` with usage example
5. Entry in README.md
6. Test coverage

## Summary

The `@bunship/eden` package provides a production-ready, type-safe API client for BunShip with:

- **738 lines** of implementation code (index, types, utils)
- **450+ lines** of example code
- **420+ lines** of test code
- **11,950 bytes** of documentation
- **Zero** runtime dependencies beyond `@elysiajs/eden`
- **100%** type-safe API calls

It's designed to be:

- Easy to use (5-minute quick start)
- Type-safe (full TypeScript support)
- Production-ready (error handling, retries, auth)
- Extensible (pluggable architecture)
- Well-documented (README, examples, tests)

Perfect for building robust client applications on top of BunShip API.
