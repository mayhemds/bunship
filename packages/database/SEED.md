# Database Seed Data

The seed script creates demo data for development and testing purposes.

## Quick Start

```bash
# From the packages/database directory
bun run seed

# Or reset database and seed
bun run reset
```

## What Gets Created

### 1. Demo User

**Email**: `demo@bunship.com`
**Password**: `demo123456`
**Role**: Regular user (not admin)

- Email verified
- Active account
- Owner of "Demo Company" organization
- Has 2 sample projects

### 2. Admin User

**Email**: `admin@bunship.com`
**Password**: `admin123456`
**Role**: Admin user

- Email verified
- Active account
- Admin flag enabled
- Owner of "Admin Organization"
- Can access `/api/v1/admin/*` endpoints

### 3. Demo Company Organization

**Slug**: `demo-company`
**Name**: Demo Company

- Created by demo user
- Has active trial subscription (14 days)
- Plan: "pro"
- Contains 2 sample projects

### 4. Sample Projects

1. **Sample Project Alpha** (`sample-alpha`)
   - Private visibility
   - API, webhooks, and analytics enabled

2. **Beta Testing** (`beta-testing`)
   - Internal visibility
   - API and analytics enabled
   - Webhooks disabled

### 5. Admin Organization

**Slug**: `admin-org`
**Name**: Admin Organization

- Created by admin user
- Active subscription (no trial)
- Plan: "enterprise"

## Idempotency

The seed script is idempotent - you can run it multiple times safely. It checks for existing records before creating new ones:

- Checks users by email
- Checks organizations by slug
- Checks memberships by user+organization
- Checks subscriptions by organization
- Checks projects by organization+slug

## Testing Scenarios

### Test User Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "demo@bunship.com",
    "password": "demo123456"
  }'
```

### Test Admin Access

```bash
# 1. Login as admin
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@bunship.com",
    "password": "admin123456"
  }'

# 2. Use returned token to access admin endpoints
curl -X GET http://localhost:3000/api/v1/admin/users \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

### Test Multi-Tenant Isolation

```bash
# Demo user should only see Demo Company's projects
# Admin user should only see Admin Organization's projects
# This demonstrates proper Row Level Security
```

## Database Schema Changes

If you add the `isAdmin` field to the users table, you'll need to generate a migration:

```bash
# Generate migration
bun run generate

# Apply migration
bun run push

# Or for production
bun run migrate
```

## Customization

Edit `/packages/database/src/seed.ts` to:

- Change demo credentials
- Add more sample data
- Create additional test scenarios
- Add custom organizations

Example:

```typescript
// Add another demo user
const user2 = await createUser({
  email: "user2@bunship.com",
  password: "password123",
  fullName: "Second User",
  emailVerified: true,
});

// Create a free tier organization
await createSubscription({
  organizationId: org.id,
  status: "active",
  planId: "free",
});
```

## Cleaning Up

To completely reset the database:

```bash
# Delete local database and recreate
bun run reset

# Or manually
rm -f local.db
bun run push
bun run seed
```

## Production Considerations

**IMPORTANT**: Never run seed scripts in production!

The seed script should only be used in:

- Local development
- CI/CD test environments
- Staging environments (with different credentials)

For production:

1. Use proper user registration flows
2. Create admin users manually through secure processes
3. Use environment-specific credentials
4. Implement proper access controls

## Troubleshooting

### "User already exists"

This is normal - the script is idempotent. It will skip existing records.

### "TURSO_DATABASE_URL is required"

Set the environment variable:

```bash
export TURSO_DATABASE_URL="file:local.db"
```

### Password hashing fails

Ensure you're using Bun runtime (not Node.js):

```bash
bun --version
```

### Seed fails midway

The script is designed to be re-run. Simply run it again:

```bash
bun run seed
```

## Scripts Reference

```bash
# Generate migration files from schema changes
bun run generate

# Push schema changes directly (development only)
bun run push

# Run migrations (production)
bun run migrate

# Open Drizzle Studio (database GUI)
bun run studio

# Seed database
bun run seed

# Reset and seed
bun run reset
```
