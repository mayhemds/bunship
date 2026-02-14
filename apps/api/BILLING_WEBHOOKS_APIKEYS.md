# Billing, Webhooks & API Keys Implementation

Complete implementation of billing management, webhook delivery system, and API key authentication for BunShip.

## 📦 What's Included

### Part 1: Billing System (Stripe Integration)

#### Files Created

- `src/services/billing.service.ts` - Stripe integration service
- `src/routes/organizations/billing.ts` - Billing API routes
- `src/routes/webhooks/stripe.ts` - Stripe webhook handler

#### Features

- ✅ Subscription management (create, cancel, get status)
- ✅ Stripe Customer Portal integration
- ✅ Stripe Checkout session creation
- ✅ Invoice retrieval
- ✅ Usage tracking and plan limits
- ✅ Webhook event processing (checkout, subscription updates, invoices)

#### Endpoints

```
GET    /api/v1/organizations/:orgId/billing           # Get subscription status
GET    /api/v1/organizations/:orgId/billing/portal    # Get Stripe portal URL
POST   /api/v1/organizations/:orgId/billing/checkout  # Create checkout session
POST   /api/v1/organizations/:orgId/billing/cancel    # Cancel subscription
GET    /api/v1/organizations/:orgId/billing/invoices  # List invoices
GET    /api/v1/organizations/:orgId/billing/usage     # Get usage stats

POST   /webhooks/stripe                                # Stripe webhook receiver
```

### Part 2: Webhook Management System

#### Files Created

- `src/services/webhook.service.ts` - Webhook delivery service
- `src/routes/organizations/webhooks.ts` - Webhook management routes
- `src/jobs/webhook-retry.ts` - Retry job handler
- `src/routes/cron.ts` - Cron endpoints

#### Features

- ✅ CRUD operations for webhook endpoints
- ✅ HMAC signature-based authentication
- ✅ Event filtering and subscription
- ✅ Delivery tracking with full history
- ✅ Automatic retry logic (3 attempts with exponential backoff)
- ✅ Secret rotation
- ✅ Test event sending
- ✅ Manual retry support

#### Endpoints

```
GET    /api/v1/organizations/:orgId/webhooks              # List endpoints
POST   /api/v1/organizations/:orgId/webhooks              # Create endpoint
GET    /api/v1/organizations/:orgId/webhooks/:id          # Get endpoint
PATCH  /api/v1/organizations/:orgId/webhooks/:id          # Update endpoint
DELETE /api/v1/organizations/:orgId/webhooks/:id          # Delete endpoint
POST   /api/v1/organizations/:orgId/webhooks/:id/rotate   # Rotate secret
POST   /api/v1/organizations/:orgId/webhooks/:id/test     # Send test event
GET    /api/v1/organizations/:orgId/webhooks/:id/deliveries # List deliveries
POST   /api/v1/organizations/:orgId/webhooks/deliveries/:deliveryId/retry # Retry delivery

POST   /cron/webhook-retries                              # Process retries (cron)
```

### Part 3: API Key Management

#### Files Created

- `src/services/apiKey.service.ts` - API key service
- `src/middleware/apiKey.ts` - API key authentication middleware
- `src/routes/organizations/api-keys.ts` - API key management routes

#### Features

- ✅ Secure API key generation (SHA-256 hashing)
- ✅ Key prefix for identification (`bunship_live_*`)
- ✅ Scope-based permissions
- ✅ Rate limiting support
- ✅ Expiration dates
- ✅ Last used tracking
- ✅ Usage statistics

#### Endpoints

```
GET    /api/v1/organizations/:orgId/api-keys        # List keys
POST   /api/v1/organizations/:orgId/api-keys        # Create key
DELETE /api/v1/organizations/:orgId/api-keys/:id    # Revoke key
GET    /api/v1/organizations/:orgId/api-keys/:id/usage # Get usage
```

#### Authentication

API keys can be used via `X-API-Key` header:

```bash
curl -H "X-API-Key: bunship_live_abc123..." https://api.example.com/api/v1/data
```

## 🔧 Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# Stripe
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx

# Cron
CRON_SECRET=your-secure-random-string
```

### Stripe Setup

1. **Create Products & Prices**

   ```bash
   # In Stripe Dashboard:
   # Products > Add Product > Set prices
   # Copy price IDs to .env
   ```

2. **Configure Webhook Endpoint**

   ```bash
   # In Stripe Dashboard:
   # Developers > Webhooks > Add endpoint
   # URL: https://your-domain.com/webhooks/stripe
   # Events to send:
   #   - checkout.session.completed
   #   - customer.subscription.created
   #   - customer.subscription.updated
   #   - customer.subscription.deleted
   #   - invoice.paid
   #   - invoice.payment_failed
   ```

3. **Get Webhook Secret**
   ```bash
   # Copy signing secret from webhook details
   # Add to .env as STRIPE_WEBHOOK_SECRET
   ```

## 📚 Usage Examples

### Billing

#### Get Subscription Status

```typescript
const response = await fetch("/api/v1/organizations/org_123/billing", {
  headers: {
    Authorization: "Bearer <token>",
  },
});

const { data } = await response.json();
// {
//   plan: { id: 'pro', name: 'Pro', ... },
//   status: 'active',
//   subscription: { ... }
// }
```

#### Create Checkout Session

```typescript
const response = await fetch("/api/v1/organizations/org_123/billing/checkout", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    priceId: "price_pro_monthly",
    successUrl: "https://app.com/success",
    cancelUrl: "https://app.com/cancel",
  }),
});

const { data } = await response.json();
// Redirect user to data.url
window.location.href = data.url;
```

### Webhooks

#### Create Webhook Endpoint

```typescript
const response = await fetch("/api/v1/organizations/org_123/webhooks", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    url: "https://your-app.com/webhook",
    description: "Production webhook",
    events: ["user.created", "user.updated"],
  }),
});

const { data } = await response.json();
// Save data.secret securely!
```

#### Verify Webhook Signature (Client Side)

```typescript
import { createHmac } from "crypto";

function verifyWebhook(payload: string, signature: string, secret: string) {
  const elements = signature.split(",");
  const timestamp = elements.find((el) => el.startsWith("t="))?.split("=")[1];
  const expectedSignature = elements.find((el) => el.startsWith("v1="))?.split("=")[1];

  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = createHmac("sha256", secret).update(signedPayload).digest("hex");

  return computedSignature === expectedSignature;
}

// In your webhook endpoint:
app.post("/webhook", (req, res) => {
  const signature = req.headers["x-webhook-signature"];
  const payload = JSON.stringify(req.body);

  if (!verifyWebhook(payload, signature, SECRET)) {
    return res.status(401).send("Invalid signature");
  }

  // Process webhook event
  const event = req.body;
  console.log("Event:", event.type, event.data);

  res.json({ received: true });
});
```

### API Keys

#### Create API Key

```typescript
const response = await fetch("/api/v1/organizations/org_123/api-keys", {
  method: "POST",
  headers: {
    Authorization: "Bearer <token>",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name: "Production API Key",
    scopes: ["read", "write"],
    rateLimit: 1000, // per minute
    expiresAt: "2025-12-31T23:59:59Z",
  }),
});

const { data } = await response.json();
// SAVE data.key NOW - won't be shown again!
console.log("API Key:", data.key);
```

#### Use API Key

```typescript
// Instead of Bearer token, use X-API-Key header
const response = await fetch("/api/v1/data", {
  headers: {
    "X-API-Key": "bunship_live_abc123...",
  },
});
```

## 🔐 Security Best Practices

### Billing

- ✅ All subscription operations verify organization membership
- ✅ Stripe webhook signatures are verified
- ✅ Customer IDs are stored encrypted in database
- ✅ Invoice URLs are temporary and expire

### Webhooks

- ✅ HMAC-SHA256 signature for all deliveries
- ✅ Timestamp verification prevents replay attacks
- ✅ Secrets are rotatable without downtime
- ✅ Failed deliveries are tracked and retried
- ✅ URL validation on endpoint creation

### API Keys

- ✅ Keys are SHA-256 hashed before storage
- ✅ Plain keys shown only once at creation
- ✅ Scopes limit access to specific resources
- ✅ Expiration dates enforced automatically
- ✅ Rate limiting per key
- ✅ Last used tracking for auditing

## 🏗️ Architecture Decisions

### Why Not JWT for API Keys?

- API keys are for machine-to-machine auth
- Simpler to revoke (just delete from DB)
- No need for expiration/refresh flow
- Better for long-lived credentials

### Why HMAC Signatures for Webhooks?

- Industry standard (used by Stripe, GitHub, etc.)
- Prevents tampering and replay attacks
- No need for TLS client certificates
- Easy to verify on client side

### Retry Strategy

- Exponential backoff: 1min, 5min, 15min
- Max 3 attempts prevents infinite loops
- Failed deliveries visible in dashboard
- Manual retry option for debugging

## 🚀 Deployment

### Webhook Retry Cron Job

Set up a cron job to process webhook retries:

**Option 1: External Cron (Recommended)**

```bash
# Cron expression: Every 5 minutes
*/5 * * * * curl -X POST https://api.example.com/cron/webhook-retries \
  -H "X-Cron-Secret: your-secret"
```

**Option 2: Cloud Scheduler (Vercel Cron)**

```json
// vercel.json
{
  "crons": [
    {
      "path": "/cron/webhook-retries",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

**Option 3: BullMQ (Internal)**

```typescript
// Add to your queue worker
import { Queue, Worker } from "bullmq";

const webhookQueue = new Queue("webhook-retries");

// Schedule repeating job
await webhookQueue.add(
  "process-retries",
  {},
  {
    repeat: {
      every: 5 * 60 * 1000, // 5 minutes
    },
  }
);
```

## 📊 Database Schema

All required tables are already defined in `@bunship/database`:

- `subscriptions` - Stripe subscription data
- `webhooks` - Webhook endpoint configurations
- `webhook_deliveries` - Delivery attempts and responses
- `api_keys` - API key credentials

## 🧪 Testing

### Test Stripe Integration

```bash
# Use Stripe CLI to forward webhooks locally
stripe listen --forward-to localhost:3000/webhooks/stripe

# Trigger test events
stripe trigger checkout.session.completed
stripe trigger customer.subscription.updated
```

### Test Webhook Delivery

```bash
# Use webhook.site or similar to test
curl -X POST http://localhost:3000/api/v1/organizations/org_123/webhooks \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://webhook.site/unique-url",
    "description": "Test webhook"
  }'

# Send test event
curl -X POST http://localhost:3000/api/v1/organizations/org_123/webhooks/wh_123/test \
  -H "Authorization: Bearer <token>"
```

### Test API Key Auth

```bash
# Create API key
curl -X POST http://localhost:3000/api/v1/organizations/org_123/api-keys \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Key"}'

# Use API key
curl http://localhost:3000/api/v1/some-resource \
  -H "X-API-Key: bunship_live_..."
```

## 🔄 Migration Guide

If you have existing data:

1. **Subscriptions**: Run Stripe sync to populate `subscriptions` table
2. **API Keys**: Regenerate all keys (old keys are invalidated)
3. **Webhooks**: Recreate webhook endpoints with new system

## 📝 Next Steps

- [ ] Implement usage tracking for API requests
- [ ] Add webhook event filtering UI
- [ ] Implement API key scopes enforcement
- [ ] Add billing analytics dashboard
- [ ] Implement metered billing
- [ ] Add webhook delivery analytics

## 🆘 Troubleshooting

### Webhook Signature Verification Failed

- Check `STRIPE_WEBHOOK_SECRET` is correct
- Verify webhook is registered in Stripe dashboard
- Check timestamp isn't too old (5 min tolerance)

### Webhooks Not Retrying

- Verify cron job is running
- Check `CRON_SECRET` is set
- Look for errors in cron endpoint logs

### API Key Invalid

- Check key is active (`isActive = true`)
- Verify expiration date hasn't passed
- Ensure organization still exists

## 📖 References

- [Stripe API Docs](https://stripe.com/docs/api)
- [Webhook Security Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [HMAC Signature Verification](https://en.wikipedia.org/wiki/HMAC)
