# @bunship/database

Drizzle ORM database package for BunShip - A production-ready multi-tenant SaaS database schema with Turso (libSQL).

## Features

- **Multi-tenant architecture** - Organizations with memberships, invitations, and RBAC
- **Complete auth system** - Users, sessions, 2FA, email verification
- **Stripe integration** - Subscriptions, billing, and payment tracking
- **Webhook management** - Endpoint configuration and delivery tracking
- **API key management** - Scoped API keys with rate limiting
- **Audit logging** - Comprehensive audit trail for compliance
- **Type-safe** - Full TypeScript types for all tables and relations

## Schema Overview

### Core Tables

- **users** - User accounts with authentication data
- **organizations** - Multi-tenant organizations
- **memberships** - User-organization relationships with roles
- **invitations** - Team invitation management
- **sessions** - JWT session tracking

### SaaS Features

- **subscriptions** - Stripe subscription data
- **apiKeys** - API authentication keys
- **webhooks** - Webhook endpoint configuration
- **webhookDeliveries** - Webhook delivery logs and retries
- **auditLogs** - Comprehensive audit trail

### Example Resources

- **projects** - Example multi-tenant resource

## Installation

```bash
bun install @bunship/database
```

## Configuration

Set environment variables:

```bash
# Local development
TURSO_DATABASE_URL="file:local.db"

# Production with Turso
TURSO_DATABASE_URL="libsql://your-database.turso.io"
TURSO_AUTH_TOKEN="your-auth-token"
```

## Usage

### Basic Client

```typescript
import { getDatabase, users, eq } from "@bunship/database";

const db = getDatabase();

// Query users
const allUsers = await db.select().from(users);

// Find by email
const user = await db.select().from(users).where(eq(users.email, "user@example.com")).limit(1);
```

### With Relations

```typescript
import { getDatabase, users, memberships, organizations } from "@bunship/database";

const db = getDatabase();

// Get user with organizations
const userWithOrgs = await db.query.users.findFirst({
  where: eq(users.id, userId),
  with: {
    memberships: {
      with: {
        organization: true,
      },
    },
  },
});
```

### Creating Records

```typescript
import { getDatabase, users, type NewUser } from "@bunship/database";

const db = getDatabase();

const newUser: NewUser = {
  email: "user@example.com",
  fullName: "John Doe",
  passwordHash: await hashPassword("secret"),
};

const [user] = await db.insert(users).values(newUser).returning();
```

### Multi-tenant Queries

```typescript
import { getDatabase, projects, eq, and, isNull } from "@bunship/database";

const db = getDatabase();

// Get all active projects for an organization
const orgProjects = await db
  .select()
  .from(projects)
  .where(and(eq(projects.organizationId, orgId), isNull(projects.deletedAt)));
```

## Database Commands

```bash
# Generate migrations
bun run db:generate

# Apply migrations
bun run db:migrate

# Push schema (development)
bun run db:push

# Open Drizzle Studio
bun run db:studio

# Drop tables
bun run db:drop

# Check migrations
bun run db:check
```

## Schema Design Patterns

### Timestamps

All tables include `createdAt` and `updatedAt`:

```typescript
createdAt: integer("created_at", { mode: "timestamp" })
  .notNull()
  .$defaultFn(() => new Date()),
updatedAt: integer("updated_at", { mode: "timestamp" })
  .notNull()
  .$defaultFn(() => new Date())
  .$onUpdateFn(() => new Date()),
```

### Soft Deletes

Use `deletedAt` for soft deletes:

```typescript
deletedAt: integer("deleted_at", { mode: "timestamp" });
```

Query active records:

```typescript
where(isNull(table.deletedAt));
```

### JSON Fields

Store flexible data in JSON columns:

```typescript
settings: text("settings", { mode: "json" })
  .$type<{
    theme?: "light" | "dark";
    features?: Record<string, boolean>;
  }>()
  .$defaultFn(() => ({}));
```

### Foreign Keys

Use cascade deletes appropriately:

```typescript
organizationId: text("organization_id")
  .notNull()
  .references(() => organizations.id, { onDelete: "cascade" });
```

### Unique Constraints

Enforce uniqueness across multiple columns:

```typescript
userOrgIdx: uniqueIndex("memberships_user_org_idx").on(table.userId, table.organizationId);
```

## Security Best Practices

1. **Never store plain text passwords** - Always hash with bcrypt/argon2
2. **Encrypt sensitive data** - Store hashed tokens, not plain text
3. **Use parameterized queries** - Drizzle handles this automatically
4. **Implement Row Level Security** - Filter by organizationId in application layer
5. **Audit sensitive operations** - Log to auditLogs table

## Multi-tenant Isolation

Always filter by `organizationId`:

```typescript
// Good - Scoped to organization
const projects = await db.select().from(projects).where(eq(projects.organizationId, orgId));

// Bad - Returns all projects across all organizations
const projects = await db.select().from(projects);
```

## Type Safety

```typescript
import type { User, NewUser, Organization, Membership, MembershipRole } from "@bunship/database";

// Insert types (optional fields)
const newUser: NewUser = {
  email: "user@example.com",
  // id, createdAt, updatedAt are auto-generated
};

// Select types (all fields)
const user: User = await db.query.users.findFirst();

// Enum types
const role: MembershipRole = "admin";
```

## Migration Workflow

1. Modify schema files in `src/schema/`
2. Generate migration: `bun run db:generate`
3. Review migration in `drizzle/` directory
4. Apply migration: `bun run db:migrate`
5. Commit both schema and migration files

## Local Development

```bash
# Start with local SQLite database
TURSO_DATABASE_URL="file:local.db" bun run db:push

# Open Drizzle Studio to view data
bun run db:studio
```

## Production Deployment

1. Create Turso database: `turso db create bunship`
2. Get auth token: `turso db tokens create bunship`
3. Set environment variables
4. Run migrations: `bun run db:migrate`

## License

MIT
