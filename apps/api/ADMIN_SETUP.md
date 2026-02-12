# Admin Routes Setup Guide

This guide walks through setting up and using the admin routes in BunShip.

## Prerequisites

1. Database schema with `isAdmin` field
2. Seeded database with admin user
3. Running API server

## Step 1: Update Database Schema

The `isAdmin` field has been added to the users table:

```typescript
// packages/database/src/schema/users.ts
export const users = sqliteTable("users", {
  // ... other fields
  isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  // ...
});
```

## Step 2: Generate and Apply Migration

```bash
# Navigate to database package
cd packages/database

# Generate migration
bun run generate

# Apply migration (development)
bun run push

# Or for production
bun run migrate
```

## Step 3: Seed Database

```bash
# Seed demo and admin users
bun run seed
```

This creates:

- **Admin user**: `admin@bunship.com` / `admin123456`
- **Demo user**: `demo@bunship.com` / `demo123456`

## Step 4: Test Admin Access

### 1. Login as Admin User

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bunship.com",
    "password": "admin123456"
  }'
```

Response:

```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "admin@bunship.com",
    "fullName": "Admin User"
  }
}
```

### 2. Access Admin Endpoints

Save the access token and use it for admin requests:

```bash
# Set token variable
TOKEN="eyJhbGciOiJIUzI1NiIs..."

# List all users
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer $TOKEN"

# Get system stats
curl -X GET http://localhost:3000/api/v1/admin/system/stats \
  -H "Authorization: Bearer $TOKEN"

# Search users
curl -X GET "http://localhost:3000/api/v1/admin/users?search=demo&page=1&limit=10" \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Update User

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/users/USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "fullName": "Updated Name",
    "isActive": false
  }'
```

### 4. Impersonate User

```bash
curl -X POST http://localhost:3000/api/v1/admin/users/USER_ID/impersonate \
  -H "Authorization: Bearer $TOKEN"
```

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "user_123",
    "email": "demo@bunship.com"
  }
}
```

Use this token to make requests as the impersonated user.

## Step 5: Test Access Control

### Regular User Cannot Access Admin Routes

```bash
# Login as demo user
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@bunship.com",
    "password": "demo123456"
  }'

# Try to access admin endpoint (should fail with 403)
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer $DEMO_TOKEN"
```

Expected response:

```json
{
  "error": {
    "name": "AuthorizationError",
    "message": "Admin access required",
    "code": "AUTHORIZATION_ERROR",
    "statusCode": 403
  }
}
```

## Creating Additional Admin Users

### Option 1: Via Database

```sql
UPDATE users
SET is_admin = 1
WHERE email = 'user@example.com';
```

### Option 2: Via Admin API

Once you have admin access, promote another user:

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/users/USER_ID \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "isAdmin": true
  }'
```

### Option 3: During Registration (Custom)

Modify the registration flow to accept an admin invite code:

```typescript
// In your auth service
if (inviteCode === process.env.ADMIN_INVITE_CODE) {
  newUser.isAdmin = true;
}
```

## Security Best Practices

### 1. Audit Logging

Consider implementing audit logs for all admin actions:

```typescript
// After any admin action
await createAuditLog({
  userId: adminUser.id,
  action: "user.update",
  resourceType: "user",
  resourceId: targetUserId,
  changes: { isActive: false },
});
```

### 2. IP Allowlisting

Restrict admin access to specific IPs:

```typescript
export const adminMiddleware = new Elysia({ name: "admin" }).derive(
  async ({ request, user, set }) => {
    const clientIp = request.headers.get("x-forwarded-for");
    const allowedIps = process.env.ADMIN_ALLOWED_IPS?.split(",") || [];

    if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
      set.status = 403;
      throw new AuthorizationError("Access denied from this IP");
    }

    // ... rest of admin check
  }
);
```

### 3. Rate Limiting

Implement stricter rate limits for admin endpoints:

```typescript
import rateLimit from "@elysiajs/rate-limit";

export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(
    rateLimit({
      max: 100, // 100 requests
      window: "1m", // per minute
    })
  )
  .use(authMiddleware)
  .use(adminMiddleware);
// ... routes
```

### 4. Multi-Factor Authentication

Require 2FA for admin users:

```typescript
export const adminMiddleware = new Elysia({ name: "admin" }).derive(async ({ user, set }) => {
  // ... check isAdmin

  if (!user.twoFactorEnabled) {
    set.status = 403;
    throw new AuthorizationError("2FA required for admin access");
  }

  return { isAdmin: true };
});
```

## Monitoring

### Track Admin Actions

Use the audit logs endpoint to monitor admin activity:

```bash
# Get recent admin actions
curl -X GET "http://localhost:3000/api/v1/admin/audit-logs?limit=50" \
  -H "Authorization: Bearer $TOKEN"
```

### Set Up Alerts

Alert on suspicious admin activity:

- Multiple failed admin login attempts
- Admin user creation/promotion
- Bulk user deletions
- Impersonation events
- Access from new IPs/locations

## Troubleshooting

### "Admin access required" Error

1. Verify user has `isAdmin: true`:

```bash
# Check in Drizzle Studio
bun run studio

# Or query database
sqlite3 local.db "SELECT id, email, is_admin FROM users WHERE email = 'admin@bunship.com';"
```

2. Verify JWT token is valid and not expired

3. Check middleware is applied correctly:

```typescript
// In routes/admin/index.ts
export const adminRoutes = new Elysia({ prefix: "/admin" })
  .use(authMiddleware) // ← Must be before adminMiddleware
  .use(adminMiddleware); // ← Checks isAdmin flag
```

### Cannot Delete Admin Users

This is intentional. To delete an admin user:

1. First remove admin privileges:

```bash
curl -X PATCH http://localhost:3000/api/v1/admin/users/USER_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{ "isAdmin": false }'
```

2. Then delete:

```bash
curl -X DELETE http://localhost:3000/api/v1/admin/users/USER_ID \
  -H "Authorization: Bearer $TOKEN"
```

### Maintenance Mode Not Persisting

The maintenance mode is currently stored in memory. For production:

1. Use Redis:

```typescript
export async function setMaintenanceMode(enabled: boolean) {
  await redis.set("system:maintenance", enabled ? "1" : "0");
  return { enabled };
}
```

2. Or use a database table:

```typescript
// Create system_settings table
export const systemSettings = sqliteTable("system_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// Set maintenance mode
await db
  .insert(systemSettings)
  .values({ key: "maintenance_mode", value: enabled ? "true" : "false" })
  .onConflictDoUpdate({
    target: systemSettings.key,
    set: { value: enabled ? "true" : "false" },
  });
```

## Next Steps

1. Implement audit logging for admin actions
2. Add admin UI/dashboard
3. Set up monitoring and alerting
4. Configure IP allowlisting
5. Enforce 2FA for admin users
6. Add role-based permissions (super admin, admin, moderator)
7. Implement bulk operations (bulk user updates, exports)
8. Add admin analytics dashboard
