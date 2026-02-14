# Quick Reference: Billing, Webhooks & API Keys

## 🚀 Quick Start

### 1. Set Environment Variables

```bash
cp .env.example .env
# Edit .env and add:
# - STRIPE_SECRET_KEY
# - STRIPE_WEBHOOK_SECRET
# - STRIPE_*_PRICE_ID values
# - CRON_SECRET
```

### 2. Configure Stripe Webhook

```
URL: https://your-domain.com/webhooks/stripe
Events: checkout.session.completed, customer.subscription.*
```

### 3. Set Up Cron Job

```bash
*/5 * * * * curl -X POST https://your-domain.com/cron/webhook-retries \
  -H "X-Cron-Secret: your-secret"
```

## 📡 API Endpoints

### Billing (JWT Auth Required)

```bash
# Get subscription status
GET /api/v1/organizations/:orgId/billing

# Open customer portal
GET /api/v1/organizations/:orgId/billing/portal

# Create checkout session
POST /api/v1/organizations/:orgId/billing/checkout
{
  "priceId": "price_xxx",
  "successUrl": "https://...",
  "cancelUrl": "https://..."
}

# Cancel subscription
POST /api/v1/organizations/:orgId/billing/cancel

# List invoices
GET /api/v1/organizations/:orgId/billing/invoices?limit=10

# Get usage
GET /api/v1/organizations/:orgId/billing/usage
```

### Webhooks (JWT Auth Required)

```bash
# Create webhook
POST /api/v1/organizations/:orgId/webhooks
{
  "url": "https://your-app.com/webhook",
  "description": "Production webhook",
  "events": ["user.created", "order.completed"]
}

# List webhooks
GET /api/v1/organizations/:orgId/webhooks

# Get webhook
GET /api/v1/organizations/:orgId/webhooks/:id

# Update webhook
PATCH /api/v1/organizations/:orgId/webhooks/:id
{
  "url": "https://new-url.com",
  "isActive": false
}

# Delete webhook
DELETE /api/v1/organizations/:orgId/webhooks/:id

# Rotate secret
POST /api/v1/organizations/:orgId/webhooks/:id/rotate

# Send test event
POST /api/v1/organizations/:orgId/webhooks/:id/test

# Get deliveries
GET /api/v1/organizations/:orgId/webhooks/:id/deliveries?limit=50

# Retry delivery
POST /api/v1/organizations/:orgId/webhooks/deliveries/:deliveryId/retry
```

### API Keys (JWT Auth Required)

```bash
# Create API key
POST /api/v1/organizations/:orgId/api-keys
{
  "name": "Production API Key",
  "scopes": ["read", "write"],
  "rateLimit": 1000,
  "expiresAt": "2025-12-31T23:59:59Z"
}
# ⚠️ Response contains plaintext key - save it now!

# List API keys
GET /api/v1/organizations/:orgId/api-keys

# Get API key
GET /api/v1/organizations/:orgId/api-keys/:id

# Revoke API key
DELETE /api/v1/organizations/:orgId/api-keys/:id

# Get usage
GET /api/v1/organizations/:orgId/api-keys/:id/usage
```

### Webhooks (Public - Stripe)

```bash
# Stripe webhook endpoint
POST /webhooks/stripe
Headers: stripe-signature
```

### Cron (Protected)

```bash
# Process webhook retries
POST /cron/webhook-retries
Headers: X-Cron-Secret: your-secret
```

## 🔐 Authentication

### Option 1: JWT Token (User Auth)

```bash
curl -H "Authorization: Bearer <token>" \
  https://api.example.com/api/v1/organizations/org_123/billing
```

### Option 2: API Key (Machine Auth)

```bash
curl -H "X-API-Key: bunship_live_abc123..." \
  https://api.example.com/api/v1/data
```

## 🔧 Service Functions

### Billing Service

```typescript
import {
  getSubscription,
  createPortalSession,
  createCheckoutSession,
  cancelSubscription,
  getInvoices,
  getUsage,
} from "./services/billing.service";

// Get subscription
const subscription = await getSubscription("org_123");

// Create checkout
const session = await createCheckoutSession(
  "org_123",
  "price_xxx",
  "https://success.com",
  "https://cancel.com"
);
```

### Webhook Service

```typescript
import {
  createEndpoint,
  dispatch,
  verifyWebhookSignature,
  rotateSecret,
} from "./services/webhook.service";

// Create endpoint
const webhook = await createEndpoint("org_123", {
  url: "https://your-app.com/webhook",
  events: ["user.created"],
});

// Dispatch event
await dispatch(webhook, "user.created", {
  userId: "user_123",
  email: "user@example.com",
});

// Verify signature (in webhook receiver)
const isValid = verifyWebhookSignature(payload, signature, secret);
```

### API Key Service

```typescript
import { createApiKey, validateApiKey, revokeApiKey } from "./services/apiKey.service";

// Create key
const { apiKey, plainKey } = await createApiKey("org_123", "user_123", {
  name: "Production Key",
  scopes: ["read", "write"],
});

// Validate key (in middleware)
const { apiKey, organizationId } = await validateApiKey(plainKey);
```

## 🎨 Middleware Usage

### API Key Middleware

```typescript
import { Elysia } from "elysia";
import { apiKeyMiddleware, requireScope } from "./middleware/apiKey";

const app = new Elysia()
  .use(apiKeyMiddleware)
  .use(requireScope("write"))
  .post("/data", ({ apiKey, organization }) => {
    // apiKey and organization available in context
    return { success: true };
  });
```

### Hybrid Auth (JWT or API Key)

```typescript
import { hybridAuthMiddleware } from "./middleware/apiKey";

const app = new Elysia()
  .use(hybridAuthMiddleware)
  .get("/data", ({ authType, user, apiKey, organization }) => {
    if (authType === "jwt") {
      // User authenticated via JWT
      console.log(user.email);
    } else {
      // Authenticated via API key
      console.log(organization.id);
    }
  });
```

## 🧪 Testing Examples

### Test Billing with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local dev
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
stripe trigger invoice.payment_failed
```

### Test Webhook Delivery

```bash
# Use webhook.site for testing
WEBHOOK_URL="https://webhook.site/unique-id"

# Create webhook
curl -X POST http://localhost:3000/api/v1/organizations/org_123/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"$WEBHOOK_URL\",\"description\":\"Test\"}"

# Send test event
curl -X POST http://localhost:3000/api/v1/organizations/org_123/webhooks/wh_123/test \
  -H "Authorization: Bearer <token>"

# Check webhook.site to see delivery
```

### Test API Key

```bash
# Create key
RESPONSE=$(curl -X POST http://localhost:3000/api/v1/organizations/org_123/api-keys \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Key"}')

# Extract key
API_KEY=$(echo $RESPONSE | jq -r '.data.key')

# Use key
curl http://localhost:3000/api/v1/some-endpoint \
  -H "X-API-Key: $API_KEY"
```

## 🐛 Debugging

### Check Webhook Deliveries

```bash
# View delivery history
curl http://localhost:3000/api/v1/organizations/org_123/webhooks/wh_123/deliveries \
  -H "Authorization: Bearer <token>"

# Check for failed deliveries
curl http://localhost:3000/api/v1/organizations/org_123/webhooks/wh_123/deliveries \
  -H "Authorization: Bearer <token>" \
  | jq '.data[] | select(.deliveredAt == null)'
```

### Test Webhook Signature Verification

```typescript
// In your webhook receiver
import { verifyWebhookSignature } from "./services/webhook.service";

app.post("/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);
  const secret = "whsec_your_secret";

  const isValid = verifyWebhookSignature(payload, signature, secret);

  if (!isValid) {
    console.log("Invalid signature!");
    console.log("Signature:", signature);
    console.log("Payload:", payload);
    return res.status(401).send("Invalid signature");
  }

  res.json({ received: true });
});
```

### Monitor Stripe Webhooks

```bash
# Check Stripe webhook dashboard
# https://dashboard.stripe.com/webhooks

# View recent events
stripe events list --limit 10
```

## 📊 Common Patterns

### Handle Subscription Change

```typescript
// After successful checkout
const subscription = await getSubscription(orgId);
if (subscription.status === "active") {
  // Unlock features based on plan
  const plan = subscription.plan;
  if (plan.id === "pro") {
    // Enable pro features
  }
}
```

### Dispatch Custom Webhook Events

```typescript
import { getDatabase, webhooks, eq } from "@bunship/database";
import { dispatch } from "./services/webhook.service";

async function notifyWebhooks(orgId: string, event: string, data: any) {
  const db = getDatabase();

  const endpoints = await db.query.webhooks.findMany({
    where: eq(webhooks.organizationId, orgId),
  });

  for (const webhook of endpoints) {
    if (webhook.isActive) {
      await dispatch(webhook, event, data);
    }
  }
}

// Usage
await notifyWebhooks("org_123", "order.completed", {
  orderId: "order_123",
  amount: 99.99,
  timestamp: new Date(),
});
```

### Check Plan Limits

```typescript
import { getUsage } from "./services/billing.service";
import { isWithinLimit } from "@bunship/config";

const usage = await getUsage(orgId);

// Check if can create more API keys
if (!isWithinLimit(usage.usage.apiKeys.current, usage.plan.limits.apiKeys)) {
  throw new Error("API key limit reached. Upgrade to create more.");
}
```

## 🔗 Related Files

- **Services**: `src/services/billing.service.ts`, `webhook.service.ts`, `apiKey.service.ts`
- **Routes**: `src/routes/organizations/billing.ts`, `webhooks.ts`, `api-keys.ts`
- **Middleware**: `src/middleware/apiKey.ts`
- **Schemas**: `@bunship/database/schema/subscriptions.ts`, `webhooks.ts`, `apiKeys.ts`
- **Config**: `@bunship/config/billing.ts`

## 📖 Full Documentation

See `BILLING_WEBHOOKS_APIKEYS.md` for comprehensive documentation.
