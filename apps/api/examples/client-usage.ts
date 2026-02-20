/**
 * Example Client Usage
 * TypeScript examples for using the Billing, Webhooks, and API Keys features
 */

// ============================================
// 1. BILLING EXAMPLES
// ============================================

/**
 * Get current subscription status
 */
async function getSubscriptionStatus(orgId: string, token: string) {
  const response = await fetch(`https://api.example.com/api/v1/organizations/${orgId}/billing`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { data } = await response.json();

  console.log("Plan:", data.plan.name);
  console.log("Status:", data.status);

  if (data.subscription) {
    console.log("Period ends:", data.subscription.currentPeriodEnd);
    console.log("Canceling:", data.subscription.cancelAtPeriodEnd);
  }

  return data;
}

/**
 * Redirect user to Stripe Checkout
 */
async function upgradeSubscription(orgId: string, priceId: string, token: string) {
  const response = await fetch(
    `https://api.example.com/api/v1/organizations/${orgId}/billing/checkout`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        priceId,
        successUrl: `${window.location.origin}/billing/success`,
        cancelUrl: `${window.location.origin}/billing/cancel`,
      }),
    }
  );

  const { data } = await response.json();

  // Redirect to Stripe Checkout
  window.location.href = data.url;
}

/**
 * Open Stripe Customer Portal
 */
async function openBillingPortal(orgId: string, token: string) {
  const response = await fetch(
    `https://api.example.com/api/v1/organizations/${orgId}/billing/portal`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { data } = await response.json();

  // Open portal in new window
  window.open(data.url, "_blank");
}

/**
 * Get usage statistics with plan limits
 */
async function checkUsageLimits(orgId: string, token: string) {
  const response = await fetch(
    `https://api.example.com/api/v1/organizations/${orgId}/billing/usage`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { data } = await response.json();

  // Check if approaching limits
  Object.entries(data.usage).forEach(([resource, info]: [string, any]) => {
    if (info.percentage > 80) {
      console.warn(`⚠️  ${resource} usage at ${info.percentage.toFixed(1)}%`);
      console.warn(`   ${info.current} / ${info.limit}`);
    }
  });

  return data;
}

// ============================================
// 2. WEBHOOK EXAMPLES
// ============================================

/**
 * Create a webhook endpoint
 */
async function createWebhook(orgId: string, token: string) {
  const response = await fetch(`https://api.example.com/api/v1/organizations/${orgId}/webhooks`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: "https://your-app.com/api/webhooks",
      description: "Production webhook for order events",
      events: ["order.created", "order.completed", "order.cancelled"],
    }),
  });

  const { data } = await response.json();

  console.log("✅ Webhook created:", data.id);
  console.log("📋 Secret:", data.secret);
  console.log("⚠️  Save this secret - you won't see it again!");

  return data;
}

/**
 * List all webhooks for an organization
 */
async function listWebhooks(orgId: string, token: string) {
  const response = await fetch(`https://api.example.com/api/v1/organizations/${orgId}/webhooks`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { data } = await response.json();

  data.forEach((webhook: any) => {
    console.log(`\nWebhook: ${webhook.id}`);
    console.log(`  URL: ${webhook.url}`);
    console.log(`  Active: ${webhook.isActive}`);
    console.log(`  Events: ${webhook.events.join(", ")}`);
  });

  return data;
}

/**
 * Send a test webhook event
 */
async function testWebhook(orgId: string, webhookId: string, token: string) {
  const response = await fetch(
    `https://api.example.com/api/v1/organizations/${orgId}/webhooks/${webhookId}/test`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { data } = await response.json();

  console.log("Test event sent!");
  console.log("Delivery ID:", data.id);
  console.log("Status:", data.statusCode);

  return data;
}

/**
 * Get webhook delivery history
 */
async function getWebhookDeliveries(orgId: string, webhookId: string, token: string) {
  const response = await fetch(
    `https://api.example.com/api/v1/organizations/${orgId}/webhooks/${webhookId}/deliveries`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { data } = await response.json();

  console.log(`\n📬 Deliveries for webhook ${webhookId}:\n`);

  data.forEach((delivery: any) => {
    const status = delivery.deliveredAt ? "✅" : "❌";
    console.log(`${status} ${delivery.event}`);
    console.log(`   Attempts: ${delivery.attempts}`);
    console.log(`   Status: ${delivery.statusCode || "pending"}`);
    if (delivery.nextRetryAt) {
      console.log(`   Retry at: ${delivery.nextRetryAt}`);
    }
  });

  return data;
}

/**
 * Verify webhook signature (in your webhook receiver)
 */
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const crypto = require("crypto");

  const elements = signature.split(",");
  const timestampElement = elements.find((el) => el.startsWith("t="));
  const signatureElement = elements.find((el) => el.startsWith("v1="));

  if (!timestampElement || !signatureElement) {
    return false;
  }

  const timestamp = parseInt(timestampElement.split("=")[1]);
  const expectedSignature = signatureElement.split("=")[1];

  // Check timestamp tolerance (5 minutes)
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - timestamp > 300) {
    console.error("Webhook timestamp too old");
    return false;
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return computedSignature === expectedSignature;
}

/**
 * Example webhook receiver endpoint
 */
async function webhookReceiver(req: Request): Promise<Response> {
  const signature = req.headers.get("x-webhook-signature");
  const eventType = req.headers.get("x-webhook-event");
  const deliveryId = req.headers.get("x-webhook-delivery-id");

  const payload = await req.text();

  // Verify signature
  const secret = process.env.WEBHOOK_SECRET!;
  if (!signature || !verifyWebhookSignature(payload, signature, secret)) {
    console.error("Invalid webhook signature");
    return new Response("Unauthorized", { status: 401 });
  }

  // Parse event
  const event = JSON.parse(payload);

  console.log(`📨 Webhook event: ${eventType}`);
  console.log(`📦 Delivery ID: ${deliveryId}`);

  // Handle different event types
  switch (eventType) {
    case "order.created":
      console.log("New order:", event.data.orderId);
      // Process new order
      break;

    case "order.completed":
      console.log("Order completed:", event.data.orderId);
      // Send confirmation email, etc.
      break;

    case "order.cancelled":
      console.log("Order cancelled:", event.data.orderId);
      // Handle cancellation
      break;

    default:
      console.log("Unhandled event type:", eventType);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { "Content-Type": "application/json" },
  });
}

// ============================================
// 3. API KEY EXAMPLES
// ============================================

/**
 * Create an API key
 */
async function createApiKey(orgId: string, token: string) {
  const response = await fetch(`https://api.example.com/api/v1/organizations/${orgId}/api-keys`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: "Production API Key",
      scopes: ["read", "write"],
      rateLimit: 1000, // requests per minute
      expiresAt: "2025-12-31T23:59:59Z",
    }),
  });

  const { data } = await response.json();

  console.log("✅ API Key created!");
  console.log("🔑 Key:", data.key);
  console.log("⚠️  SAVE THIS NOW - you won't see it again!");
  console.log("\nDetails:");
  console.log("  ID:", data.id);
  console.log("  Name:", data.name);
  console.log("  Prefix:", data.prefix);
  console.log("  Expires:", data.expiresAt);

  return data.key;
}

/**
 * List API keys
 */
async function listApiKeys(orgId: string, token: string) {
  const response = await fetch(`https://api.example.com/api/v1/organizations/${orgId}/api-keys`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const { data } = await response.json();

  console.log("\n🔑 API Keys:\n");

  data.forEach((key: any) => {
    const active = key.isActive ? "✅" : "❌";
    console.log(`${active} ${key.name}`);
    console.log(`   Prefix: ${key.prefix}`);
    console.log(`   Last used: ${key.lastUsedAt || "Never"}`);
    if (key.expiresAt) {
      console.log(`   Expires: ${key.expiresAt}`);
    }
  });

  return data;
}

/**
 * Use an API key to make authenticated requests
 */
async function useApiKey(apiKey: string) {
  const response = await fetch("https://api.example.com/api/v1/organizations/org_123/data", {
    headers: {
      "X-API-Key": apiKey,
    },
  });

  if (!response.ok) {
    console.error("API request failed:", response.status);
    throw new Error("Authentication failed");
  }

  const data = await response.json();
  console.log("✅ API request successful!");

  return data;
}

/**
 * Revoke an API key
 */
async function revokeApiKey(orgId: string, keyId: string, token: string) {
  const response = await fetch(
    `https://api.example.com/api/v1/organizations/${orgId}/api-keys/${keyId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const { message } = await response.json();

  console.log("🗑️  API key revoked:", message);
}

// ============================================
// 4. COMPLETE WORKFLOW EXAMPLES
// ============================================

/**
 * Complete onboarding flow: Subscribe to plan + setup integrations
 */
async function completeOnboarding(orgId: string, priceId: string, token: string) {
  console.log("Starting onboarding...\n");

  // Step 1: Subscribe to a plan
  console.log("1️⃣  Creating checkout session...");
  await upgradeSubscription(orgId, priceId, token);

  // After successful checkout (webhook will update subscription):

  // Step 2: Create webhook endpoint
  console.log("\n2️⃣  Creating webhook endpoint...");
  const webhook = await createWebhook(orgId, token);

  // Save webhook secret securely
  await saveToEnvironment("WEBHOOK_SECRET", webhook.secret);

  // Step 3: Create API key
  console.log("\n3️⃣  Creating API key...");
  const apiKey = await createApiKey(orgId, token);

  // Save API key securely
  await saveToEnvironment("API_KEY", apiKey);

  console.log("\n✅ Onboarding complete!");
  console.log("📋 Check your environment variables for secrets");
}

/**
 * Monitor system health
 */
async function monitorHealth(orgId: string, token: string) {
  console.log("🔍 Health Check\n");

  // Check subscription status
  const subscription = await getSubscriptionStatus(orgId, token);
  console.log(`\n💳 Subscription: ${subscription.plan.name} (${subscription.status})`);

  // Check usage limits
  const usage = await checkUsageLimits(orgId, token);

  // Check webhook health
  const webhooks = await listWebhooks(orgId, token);
  const activeWebhooks = webhooks.filter((w: any) => w.isActive).length;
  console.log(`\n📡 Active webhooks: ${activeWebhooks}`);

  // Check for failed webhook deliveries
  for (const webhook of webhooks) {
    const deliveries = await getWebhookDeliveries(orgId, webhook.id, token);
    const failed = deliveries.filter((d: any) => !d.deliveredAt).length;

    if (failed > 0) {
      console.warn(`⚠️  ${webhook.url} has ${failed} failed deliveries`);
    }
  }

  // Check API keys
  const keys = await listApiKeys(orgId, token);
  const activeKeys = keys.filter((k: any) => k.isActive).length;
  console.log(`\n🔑 Active API keys: ${activeKeys}`);

  // Check for expiring keys
  const expiringKeys = keys.filter((k: any) => {
    if (!k.expiresAt) return false;
    const daysUntilExpiry = (new Date(k.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return daysUntilExpiry < 30;
  });

  if (expiringKeys.length > 0) {
    console.warn(`⚠️  ${expiringKeys.length} API keys expiring within 30 days`);
  }

  console.log("\n✅ Health check complete");
}

// ============================================
// HELPER FUNCTIONS
// ============================================

async function saveToEnvironment(key: string, value: string) {
  // This would save to your secure environment storage
  console.log(`📝 Saved ${key} to environment`);
  // In production: save to secrets manager, .env.local, etc.
}

// ============================================
// USAGE
// ============================================

/*
// Example usage:
const orgId = 'org_123';
const token = 'eyJ...'; // JWT token

// Check subscription
await getSubscriptionStatus(orgId, token);

// Create webhook
const webhook = await createWebhook(orgId, token);

// Create API key
const apiKey = await createApiKey(orgId, token);

// Use API key
await useApiKey(apiKey);

// Monitor health
await monitorHealth(orgId, token);
*/

export {
  // Billing
  getSubscriptionStatus,
  upgradeSubscription,
  openBillingPortal,
  checkUsageLimits,
  // Webhooks
  createWebhook,
  listWebhooks,
  testWebhook,
  getWebhookDeliveries,
  verifyWebhookSignature,
  webhookReceiver,
  // API Keys
  createApiKey,
  listApiKeys,
  useApiKey,
  revokeApiKey,
  // Workflows
  completeOnboarding,
  monitorHealth,
};
