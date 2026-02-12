# @bunship/config

Shared configuration package for BunShip - the Bun + Elysia SaaS boilerplate.

## Overview

This package centralizes all application configuration: API settings, billing plans, feature flags, and RBAC permissions. All configs are typed `as const` for full type inference.

## Installation

This is an internal workspace package. Import it in other packages:

```typescript
import { appConfig, billingConfig, featuresConfig } from "@bunship/config";
```

## Modules

### App Config (`app.ts`)

Core application settings including API, JWT, CORS, and company details:

```typescript
import { appConfig } from "@bunship/config";

// API settings
appConfig.api.port; // 3000 (from PORT env var)
appConfig.api.prefix; // "/api/v1"
appConfig.api.rateLimit; // { enabled: true, windowMs: 60000, maxRequests: 100 }
appConfig.api.cors.origins; // from CORS_ORIGINS env var

// JWT configuration
appConfig.jwt.accessTokenExpiry; // "15m"
appConfig.jwt.refreshTokenExpiry; // "7d"

// URLs
appConfig.url; // from API_URL env var, default "http://localhost:3000"
appConfig.frontendUrl; // from FRONTEND_URL env var, default "http://localhost:5173"
```

Environment variables:

- `PORT` - API port (default: `3000`)
- `API_URL` - Public API URL (default: `http://localhost:3000`)
- `FRONTEND_URL` - Frontend URL (default: `http://localhost:5173`)
- `CORS_ORIGINS` - Comma-separated allowed origins

### Billing Config (`billing.ts`)

Stripe plans, pricing, and usage limit definitions:

```typescript
import { billingConfig, getPlan, isWithinLimit } from "@bunship/config";

// Get all plans
billingConfig.plans; // [free, pro, enterprise]

// Look up a plan
const pro = getPlan("pro");
pro.price.monthly; // 29
pro.limits.members; // 10
pro.limits.apiRequests; // 100000
pro.stripePriceIds.monthly; // from STRIPE_PRO_MONTHLY_PRICE_ID env var

// Check limits (-1 means unlimited)
isWithinLimit(5, pro.limits.members); // true
isWithinLimit(11, pro.limits.members); // false
```

Plans:
| Plan | Monthly | Members | Projects | API Requests |
|------|---------|---------|----------|--------------|
| Free | $0 | 2 | 3 | 1,000 |
| Pro | $29 | 10 | 25 | 100K |
| Enterprise | $99 | Unlimited | Unlimited | Unlimited |

Environment variables:

- `STRIPE_PRO_MONTHLY_PRICE_ID` - Stripe price ID for Pro monthly
- `STRIPE_PRO_YEARLY_PRICE_ID` - Stripe price ID for Pro yearly
- `STRIPE_ENTERPRISE_MONTHLY_PRICE_ID` - Stripe price ID for Enterprise monthly
- `STRIPE_ENTERPRISE_YEARLY_PRICE_ID` - Stripe price ID for Enterprise yearly

### Features Config (`features.ts`)

Feature flags and behavioral configuration:

```typescript
import { featuresConfig } from "@bunship/config";

// Auth settings
featuresConfig.auth.enableTwoFactor; // true
featuresConfig.auth.password.minLength; // 8
featuresConfig.auth.lockout.maxAttempts; // 5

// Organization settings
featuresConfig.organizations.roles; // ["owner", "admin", "member", "viewer"]
featuresConfig.organizations.maxOrgsPerUser; // 10
featuresConfig.organizations.permissions.admin; // ["org:read", "org:update", ...]

// Billing
featuresConfig.billing.trialDays; // 14

// Webhooks
featuresConfig.webhooks.maxRetries; // 5
featuresConfig.webhooks.events; // ["organization.created", ...]

// Background jobs (Redis)
featuresConfig.jobs.redis.host; // from REDIS_HOST env var
featuresConfig.jobs.redis.port; // from REDIS_PORT env var
```

Environment variables:

- `REDIS_HOST` - Redis host (default: `localhost`)
- `REDIS_PORT` - Redis port (default: `6379`)

### Permissions (`permissions.ts`)

RBAC permission definitions and utilities:

```typescript
import { hasPermission, hasAllPermissions, permissions } from "@bunship/config";

// Check single permission
hasPermission(["org:read", "members:*"], "members:invite"); // true (wildcard match)

// Check multiple permissions
hasAllPermissions(["*"], ["org:read", "billing:manage"]); // true (global wildcard)

// List permissions for a category
getCategoryPermissions("members"); // ["members:read", "members:invite", ...]
```

Available permission categories: `org`, `members`, `invitations`, `projects`, `webhooks`, `api-keys`, `billing`, `audit-logs`, `admin`.

## Exported Types

```typescript
import type {
  AppConfig,
  BillingConfig,
  FeaturesConfig,
  PlanId, // "free" | "pro" | "enterprise"
  Plan, // Full plan object type
  OrgRole, // "owner" | "admin" | "member" | "viewer"
  WebhookEvent, // Union of all webhook event strings
  ApiKeyScope, // Union of all API key scope strings
  AuditEvent, // Union of all audit event strings
  Permission, // Union of all permission strings
} from "@bunship/config";
```

## Customization

To customize for your project, edit the config files directly. All values are plain TypeScript objects — no runtime config loading, no YAML/JSON parsing.

1. **Change plans** - Edit `billing.ts` to modify plan names, prices, and limits
2. **Toggle features** - Set flags in `features.ts` (e.g., `enableGithubOAuth: false`)
3. **Adjust permissions** - Add/remove roles and permissions in `features.ts` and `permissions.ts`
4. **Update company info** - Edit `company` in `app.ts`

## Development

```bash
bun run typecheck  # Type checking
bun run lint       # Linting
```

## License

MIT
