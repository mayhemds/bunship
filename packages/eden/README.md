# @bunship/eden

> Type-safe API client for BunShip using Elysia Eden

The `@bunship/eden` package provides a fully type-safe client for the BunShip API, powered by [Elysia Eden](https://elysiajs.com/eden/overview.html). With Eden, you get end-to-end type safety, autocomplete, and compile-time validation for all API calls.

## Features

- **Full Type Safety**: Compile-time validation of all API calls
- **Auto-complete**: IntelliSense for all endpoints, parameters, and responses
- **Zero Code Generation**: Types are inferred directly from your Elysia server
- **Type-safe Error Handling**: Strongly typed error responses
- **Lightweight**: Minimal runtime overhead

## Installation

This package is part of the BunShip monorepo and is automatically available in workspace projects:

```json
{
  "dependencies": {
    "@bunship/eden": "workspace:*"
  }
}
```

For external projects, install both the client package and the peer dependency:

```bash
bun add @bunship/eden @elysiajs/eden
```

## Quick Start

### Basic Usage

```typescript
import { createClient } from "@bunship/eden";

// Create a client instance
const client = createClient("http://localhost:3000");

// Make type-safe API calls
const health = await client.health.get();
console.log(health.data); // { status: "ok", timestamp: "..." }

// Access root endpoint
const root = await client.index.get();
console.log(root.data); // { message: "BunShip API", status: "running" }
```

### Authentication

```typescript
import { createClient } from "@bunship/eden";

const client = createClient("http://localhost:3000");

// Login and get tokens
const auth = await client.auth.login.post({
  email: "user@example.com",
  password: "secure_password",
});

if (auth.data) {
  const { accessToken, user } = auth.data;
  console.log(`Logged in as ${user.email}`);

  // Create authenticated client
  const authenticatedClient = createClient("http://localhost:3000", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  // Make authenticated requests
  const profile = await authenticatedClient.auth.me.get();
  console.log(profile.data);
}
```

### Working with Organizations

```typescript
import { createClient } from "@bunship/eden";

const client = createClient("http://localhost:3000", {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// List organizations
const orgs = await client.organizations.get();
console.log(orgs.data); // OrganizationResponse[]

// Get specific organization
const org = await client.organizations({ id: "org_123" }).get();
console.log(org.data); // OrganizationResponse

// Create organization
const newOrg = await client.organizations.post({
  name: "My Company",
  slug: "my-company",
});
console.log(newOrg.data);

// Update organization
const updated = await client.organizations({ id: "org_123" }).patch({
  name: "Updated Name",
});
console.log(updated.data);
```

### Error Handling

Eden provides type-safe error handling with proper TypeScript inference:

```typescript
import { createClient } from "@bunship/eden";
import { isErrorResponse } from "@bunship/eden/types";

const client = createClient("http://localhost:3000");

const result = await client.auth.login.post({
  email: "user@example.com",
  password: "wrong_password",
});

// Check for errors
if (result.error) {
  console.error(`Error ${result.status}: ${result.error.message}`);
  // Handle specific error codes
  if (result.status === 401) {
    console.log("Invalid credentials");
  }
} else {
  console.log("Login successful:", result.data);
}

// Using type guard
const response = await client.auth.me.get();
if (isErrorResponse(response)) {
  console.error("API Error:", response.error);
}
```

### Pagination

Work with paginated endpoints using type-safe pagination parameters:

```typescript
import { createClient, type PaginationParams } from "@bunship/eden";

const client = createClient("http://localhost:3000", {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// Fetch paginated data
const params: PaginationParams = {
  page: 1,
  limit: 20,
  sort: "createdAt",
  order: "desc",
};

const result = await client.organizations.get({ query: params });

if (result.data) {
  console.log(`Page ${result.data.pagination.page} of ${result.data.pagination.totalPages}`);
  console.log(`Total items: ${result.data.pagination.total}`);
  result.data.data.forEach((org) => {
    console.log(`- ${org.name}`);
  });
}
```

### API Keys Management

```typescript
import { createClient } from "@bunship/eden";

const client = createClient("http://localhost:3000", {
  headers: { Authorization: `Bearer ${accessToken}` },
});

// Create API key
const newKey = await client.api.keys.post({
  name: "Production Key",
  expiresIn: 365, // days
});

if (newKey.data) {
  // IMPORTANT: Save this key - it's only shown once!
  console.log("API Key:", newKey.data.key);
  console.log("Prefix:", newKey.data.prefix);
}

// List API keys
const keys = await client.api.keys.get();
console.log("Your API keys:", keys.data);

// Revoke API key
await client.api.keys({ id: "key_123" }).delete();
```

## TypeScript Benefits

### Autocomplete

Eden provides full IntelliSense support:

```typescript
const client = createClient("http://localhost:3000");

// Type hints for all available endpoints
client.
//     ^ IntelliSense shows: health, auth, organizations, api, etc.

// Type hints for HTTP methods
client.health.
//           ^ IntelliSense shows: get, post, put, patch, delete

// Type hints for request body
await client.auth.login.post({
  // IntelliSense suggests required fields: email, password
  email: "",
  password: "",
});
```

### Type Inference

Response types are automatically inferred:

```typescript
const health = await client.health.get();
// health.data is typed as { status: string; timestamp: string }

const orgs = await client.organizations.get();
// orgs.data is typed as OrganizationResponse[]

const org = await client.organizations({ id: "org_123" }).get();
// org.data is typed as OrganizationResponse
```

### Compile-time Validation

TypeScript catches errors at compile time:

```typescript
// ❌ Compile error: Property 'invalidEndpoint' does not exist
await client.invalidEndpoint.get();

// ❌ Compile error: Missing required field 'password'
await client.auth.login.post({
  email: "user@example.com",
});

// ❌ Compile error: Wrong HTTP method
await client.health.post();
```

## Advanced Usage

### Custom Headers

```typescript
const client = createClient("http://localhost:3000", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    "X-Organization-ID": "org_123",
    "X-Request-ID": crypto.randomUUID(),
  },
});
```

### Custom Fetch Options

```typescript
const client = createClient("http://localhost:3000", {
  fetch: {
    // Custom fetch options
    credentials: "include",
    mode: "cors",
  },
});
```

### Environment-specific Clients

```typescript
const getClient = () => {
  const baseUrl =
    process.env.NODE_ENV === "production" ? "https://api.bunship.com" : "http://localhost:3000";

  return createClient(baseUrl);
};

export const client = getClient();
```

### Reusable Authenticated Client

```typescript
// lib/api-client.ts
import { createClient, type BunShipClient } from "@bunship/eden";

let _client: BunShipClient | null = null;
let _token: string | null = null;

export function setAuthToken(token: string) {
  _token = token;
  _client = null; // Reset client to use new token
}

export function getClient(): BunShipClient {
  if (!_client) {
    const baseUrl = process.env.API_URL || "http://localhost:3000";
    _client = createClient(baseUrl, {
      headers: _token ? { Authorization: `Bearer ${_token}` } : {},
    });
  }
  return _client;
}

// Usage
import { getClient, setAuthToken } from "./lib/api-client";

// After login
setAuthToken(accessToken);

// Make requests
const client = getClient();
const profile = await client.auth.me.get();
```

## Type Exports

The package exports useful types for working with API responses:

```typescript
import type {
  BunShipClient,
  ErrorResponse,
  HealthResponse,
  PaginatedResponse,
  PaginationParams,
  SuccessResponse,
  AuthResponse,
  OrganizationResponse,
  OrganizationMember,
  ApiKeyResponse,
} from "@bunship/eden";

// Use in your code
function handleError(error: ErrorResponse) {
  console.error(`${error.statusCode}: ${error.message}`);
}
```

## Best Practices

### 1. Environment Configuration

Store API URLs in environment variables:

```typescript
// .env
API_URL=http://localhost:3000

// client.ts
const client = createClient(process.env.API_URL!);
```

### 2. Token Management

Implement token refresh logic:

```typescript
import { createClient } from "@bunship/eden";

class ApiClient {
  private client;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor(baseUrl: string) {
    this.client = createClient(baseUrl);
  }

  async login(email: string, password: string) {
    const result = await this.client.auth.login.post({ email, password });
    if (result.data) {
      this.accessToken = result.data.accessToken;
      this.refreshToken = result.data.refreshToken;
      this.updateClient();
    }
    return result;
  }

  private updateClient() {
    this.client = createClient(process.env.API_URL!, {
      headers: this.accessToken ? { Authorization: `Bearer ${this.accessToken}` } : {},
    });
  }

  async refreshAccessToken() {
    if (!this.refreshToken) throw new Error("No refresh token");

    const result = await this.client.auth.refresh.post({
      refreshToken: this.refreshToken,
    });

    if (result.data) {
      this.accessToken = result.data.accessToken;
      this.updateClient();
    }

    return result;
  }

  getClient() {
    return this.client;
  }
}
```

### 3. Error Handling

Create a centralized error handler:

```typescript
import { type ErrorResponse } from "@bunship/eden/types";

export class ApiError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "ApiError";
  }

  static fromResponse(error: ErrorResponse): ApiError {
    return new ApiError(error.statusCode, error.message, error.details);
  }
}

// Usage
const result = await client.auth.me.get();
if (result.error) {
  throw ApiError.fromResponse(result.error);
}
```

### 4. Request Interceptors

Add logging or monitoring:

```typescript
const client = createClient("http://localhost:3000", {
  onRequest: (path, options) => {
    console.log(`[API] ${options.method} ${path}`);
  },
  onResponse: (response) => {
    console.log(`[API] Response: ${response.status}`);
  },
});
```

## Migration from Fetch/Axios

If you're migrating from traditional HTTP clients:

### Before (fetch)

```typescript
const response = await fetch("http://localhost:3000/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const data = await response.json();
```

### After (Eden)

```typescript
const result = await client.auth.login.post({ email, password });
const data = result.data;
```

### Before (axios)

```typescript
const { data } = await axios.get("http://localhost:3000/organizations", {
  headers: { Authorization: `Bearer ${token}` },
  params: { page: 1, limit: 20 },
});
```

### After (Eden)

```typescript
const result = await client.organizations.get({
  query: { page: 1, limit: 20 },
});
const data = result.data;
```

## Related Packages

- `@elysiajs/eden` - The underlying Eden client library
- `@bunship/database` - Database schema and queries
- `@bunship/utils` - Shared utilities

## Resources

- [Elysia Documentation](https://elysiajs.com/)
- [Eden Treaty Documentation](https://elysiajs.com/eden/treaty/overview.html)
- [BunShip Documentation](../../README.md)

## License

MIT
