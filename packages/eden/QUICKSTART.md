# Quick Start Guide - @bunship/eden

Get up and running with the BunShip Eden client in 5 minutes.

## Installation

```bash
# In your workspace project
bun add @bunship/eden

# For external projects
bun add @bunship/eden @elysiajs/eden
```

## Basic Usage

### 1. Create a Client

```typescript
import { createClient } from "@bunship/eden";

const client = createClient("http://localhost:3000");
```

### 2. Make Your First Request

```typescript
// Health check
const health = await client.health.get();
console.log(health.data); // { status: "ok", timestamp: "..." }
```

### 3. Handle Authentication

```typescript
// Login
const auth = await client.auth.login.post({
  email: "user@example.com",
  password: "your_password",
});

// Create authenticated client
const authClient = createClient("http://localhost:3000", {
  headers: { Authorization: `Bearer ${auth.data.accessToken}` },
});

// Get profile
const profile = await authClient.auth.me.get();
console.log(profile.data);
```

## Common Patterns

### Error Handling

```typescript
const result = await client.auth.login.post({ email, password });

if (result.error) {
  console.error(`Error: ${result.error.message}`);
  return;
}

console.log("Success:", result.data);
```

### Using the AuthenticatedClient Helper

```typescript
import { AuthenticatedClient } from "@bunship/eden";

const auth = new AuthenticatedClient("http://localhost:3000");

// Login
await auth.login("user@example.com", "password");

// Make authenticated requests (auto-refreshes token on 401)
const data = await auth.withAuth((client) => client.organizations.get());

// Logout
await auth.logout();
```

### Retry Failed Requests

```typescript
import { withRetry } from "@bunship/eden";

const data = await withRetry(() => client.organizations.get(), { maxRetries: 3 });
```

### Custom Error Handling

```typescript
import { BunShipApiError, unwrapResponse } from "@bunship/eden";

try {
  const result = await client.auth.login.post({ email, password });
  const data = unwrapResponse(result); // Throws on error
  console.log(data);
} catch (error) {
  if (error instanceof BunShipApiError) {
    if (error.isAuthError()) {
      console.log("Invalid credentials");
    }
    console.log(error.getUserMessage());
  }
}
```

## Next Steps

- Read the [full README](./README.md) for detailed documentation
- Check out [examples](./src/example.ts) for more patterns
- Review [types](./src/types.ts) for all available response types
- Explore [utilities](./src/utils.ts) for advanced features

## Common Operations

### Organizations

```typescript
// List
const orgs = await authClient.organizations.get();

// Create
const newOrg = await authClient.organizations.post({
  name: "My Company",
  slug: "my-company",
});

// Get one
const org = await authClient.organizations({ id: "org_123" }).get();

// Update
await authClient.organizations({ id: "org_123" }).patch({ name: "New Name" });

// Delete
await authClient.organizations({ id: "org_123" }).delete();
```

### API Keys

```typescript
// Create
const key = await authClient.api.keys.post({
  name: "Production Key",
  expiresIn: 365,
});
console.log("Save this key:", key.data.key); // Only shown once!

// List
const keys = await authClient.api.keys.get();

// Revoke
await authClient.api.keys({ id: "key_123" }).delete();
```

### Pagination

```typescript
const result = await authClient.organizations.get({
  query: { page: 1, limit: 20, sort: "createdAt", order: "desc" },
});

console.log(`Page ${result.data.pagination.page} of ${result.data.pagination.totalPages}`);
```

## Environment Configuration

```typescript
// .env
API_URL=http://localhost:3000

// client.ts
const client = createClient(process.env.API_URL!);
```

## TypeScript Tips

1. **Auto-complete works everywhere**:

   ```typescript
   client. // ← IntelliSense shows all endpoints
   ```

2. **Response types are inferred**:

   ```typescript
   const result = await client.health.get();
   // result.data is typed as HealthResponse
   ```

3. **Compile-time validation**:
   ```typescript
   // ❌ TypeScript error - field doesn't exist
   await client.invalidEndpoint.get();
   ```

## Need Help?

- Check the [README](./README.md) for comprehensive docs
- Review [test examples](./src/__tests__/client.test.ts)
- See [example usage](./src/example.ts) for patterns
- Refer to [utilities docs](./src/utils.ts) for advanced features

## Pro Tips

1. **Use AuthenticatedClient** for automatic token refresh
2. **Use withRetry** for flaky network conditions
3. **Use unwrapResponse** to simplify error handling
4. **Store tokens in localStorage** for persistence
5. **Enable request logging** in development for debugging

```typescript
// Pro pattern: Production-ready client setup
import { AuthenticatedClient, LocalStorageTokenStorage, createRequestLogger } from "@bunship/eden";

const auth = new AuthenticatedClient(process.env.API_URL!, new LocalStorageTokenStorage(), {
  onTokenRefresh: (token) => {
    console.log("Token refreshed");
  },
});

// Use in dev only
if (process.env.NODE_ENV === "development") {
  const logger = createRequestLogger();
  // Apply to client as needed
}

export { auth };
```

Happy coding!
