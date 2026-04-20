/**
 * Webhook Service
 * Handles webhook endpoint management and delivery
 */
import { timingSafeEqual } from "node:crypto";
import { promises as dns } from "node:dns";
import { isIP } from "node:net";
import {
  getDatabase,
  webhooks,
  webhookDeliveries,
  eq,
  and,
  inArray,
  isNull,
  or,
  sql,
} from "@bunship/database";
import { NotFoundError, ValidationError } from "@bunship/utils";
import type { Webhook, WebhookDelivery } from "@bunship/database";

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^0\./,
];
const BLOCKED_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1", "[::1]"]);

function isPrivateIPv4(ip: string): boolean {
  return PRIVATE_IP_PATTERNS.some((p) => p.test(ip));
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::" || lower === "::0") return true;
  // Unique local (fc00::/7), link-local (fe80::/10), IPv4-mapped private ranges.
  if (/^f[cd][0-9a-f]{2}:/.test(lower)) return true;
  if (/^fe[89ab][0-9a-f]:/.test(lower)) return true;
  if (lower.startsWith("::ffff:")) {
    const v4 = lower.slice(7);
    if (isIP(v4) === 4) return isPrivateIPv4(v4);
  }
  return false;
}

function assertPublicAddress(ip: string): void {
  const family = isIP(ip);
  if (family === 0) {
    throw new ValidationError("Webhook URL resolved to an invalid address");
  }
  if (family === 4 && isPrivateIPv4(ip)) {
    throw new ValidationError("Webhook URL must not point to a private IP address");
  }
  if (family === 6 && isPrivateIPv6(ip)) {
    throw new ValidationError("Webhook URL must not point to a private IP address");
  }
}

/**
 * Validate a webhook URL. Performs syntactic checks on the hostname AND
 * resolves DNS to guard against rebinding attacks where a public hostname
 * resolves to private IPs.
 */
async function validateWebhookUrl(url: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new ValidationError("Invalid webhook URL");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:")
    throw new ValidationError("Webhook URL must use http or https");
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(hostname))
    throw new ValidationError("Webhook URL must not point to a local or internal address");

  // If the hostname is already a literal IP, validate it directly.
  const literal = hostname.replace(/^\[|\]$/g, "");
  if (isIP(literal) !== 0) {
    assertPublicAddress(literal);
    return;
  }

  if (!hostname.includes("."))
    throw new ValidationError("Webhook URL must not point to an internal service hostname");

  // Resolve DNS and reject any private addresses.
  let addresses: { address: string; family: number }[];
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch {
    throw new ValidationError("Webhook URL hostname could not be resolved");
  }

  for (const { address } of addresses) {
    assertPublicAddress(address);
  }
}

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [60, 300, 900]; // 1min, 5min, 15min

/**
 * Generate webhook secret
 */
export function generateWebhookSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `whsec_${hex}`;
}

/**
 * HMAC-SHA256 helper using Web Crypto API
 */
async function hmacSha256(key: string, message: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(message));
  return Array.from(new Uint8Array(signature), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign webhook payload
 */
export async function signWebhookPayload(payload: string, secret: string): Promise<string> {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = await hmacSha256(secret, signedPayload);

  return `t=${timestamp},v1=${signature}`;
}

/**
 * Verify webhook signature
 */
export async function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
  tolerance = 300 // 5 minutes
): Promise<boolean> {
  const elements = signature.split(",");
  const timestampElement = elements.find((el) => el.startsWith("t="));
  const signatureElement = elements.find((el) => el.startsWith("v1="));

  if (!timestampElement || !signatureElement) {
    return false;
  }

  const timestamp = parseInt(timestampElement.split("=")[1]!);
  const expectedSignature = signatureElement.split("=")[1]!;

  // Check timestamp tolerance
  const currentTime = Math.floor(Date.now() / 1000);
  if (currentTime - timestamp > tolerance) {
    return false;
  }

  // Verify signature
  const signedPayload = `${timestamp}.${payload}`;
  const computedSignature = await hmacSha256(secret, signedPayload);

  const a = Buffer.from(computedSignature);
  const b = Buffer.from(expectedSignature);
  if (a.byteLength !== b.byteLength) return false;
  return timingSafeEqual(a, b);
}

/**
 * Create webhook endpoint
 */
export async function createEndpoint(
  orgId: string,
  data: {
    url: string;
    description?: string;
    events?: string[];
  }
): Promise<Webhook> {
  const db = getDatabase();

  // Validate URL format and reject internal/private addresses (SSRF prevention)
  await validateWebhookUrl(data.url);

  const secret = generateWebhookSecret();

  const [webhook] = await db
    .insert(webhooks)
    .values({
      organizationId: orgId,
      url: data.url,
      description: data.description || null,
      secret,
      events: data.events || [],
      isActive: true,
    })
    .returning();

  return webhook!;
}

/**
 * Get webhook endpoint
 */
export async function getEndpoint(webhookId: string, orgId: string): Promise<Webhook> {
  const db = getDatabase();

  const webhook = await db.query.webhooks.findFirst({
    where: and(eq(webhooks.id, webhookId), eq(webhooks.organizationId, orgId)),
  });

  if (!webhook) {
    throw new NotFoundError("Webhook endpoint");
  }

  return webhook;
}

/**
 * List webhook endpoints
 */
export async function listEndpoints(orgId: string): Promise<Webhook[]> {
  const db = getDatabase();

  return db.query.webhooks.findMany({
    where: eq(webhooks.organizationId, orgId),
    orderBy: (webhooks, { desc }) => [desc(webhooks.createdAt)],
  });
}

/**
 * Update webhook endpoint
 */
export async function updateEndpoint(
  webhookId: string,
  orgId: string,
  data: {
    url?: string;
    description?: string;
    events?: string[];
    isActive?: boolean;
  }
): Promise<Webhook> {
  const db = getDatabase();

  // Verify ownership
  await getEndpoint(webhookId, orgId);

  // Validate URL if provided - reject internal/private addresses (SSRF prevention)
  if (data.url) {
    await validateWebhookUrl(data.url);
  }

  const [updated] = await db
    .update(webhooks)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, webhookId))
    .returning();

  return updated!;
}

/**
 * Delete webhook endpoint
 */
export async function deleteEndpoint(webhookId: string, orgId: string): Promise<void> {
  const db = getDatabase();

  // Verify ownership
  await getEndpoint(webhookId, orgId);

  await db.delete(webhooks).where(eq(webhooks.id, webhookId));
}

/**
 * Rotate webhook secret
 */
export async function rotateSecret(webhookId: string, orgId: string): Promise<{ secret: string }> {
  const db = getDatabase();

  // Verify ownership
  await getEndpoint(webhookId, orgId);

  const newSecret = generateWebhookSecret();

  await db
    .update(webhooks)
    .set({
      secret: newSecret,
      updatedAt: new Date(),
    })
    .where(eq(webhooks.id, webhookId));

  return { secret: newSecret };
}

/**
 * Send test event to webhook
 */
export async function sendTestEvent(webhookId: string, orgId: string): Promise<WebhookDelivery> {
  const webhook = await getEndpoint(webhookId, orgId);

  const testPayload = {
    type: "test",
    timestamp: new Date().toISOString(),
    data: {
      message: "This is a test webhook event",
      webhookId: webhook.id,
    },
  };

  return dispatch(webhook, "test", testPayload);
}

/**
 * Dispatch webhook event
 */
export async function dispatch(
  webhook: Webhook,
  event: string,
  payload: Record<string, any>
): Promise<WebhookDelivery> {
  const db = getDatabase();

  // Check if webhook is active
  if (!webhook.isActive) {
    throw new ValidationError("Webhook is not active");
  }

  // Check if webhook should receive this event
  if (webhook.events.length > 0 && !webhook.events.includes(event)) {
    throw new ValidationError("Webhook not subscribed to this event");
  }

  // Create delivery record
  const [delivery] = await db
    .insert(webhookDeliveries)
    .values({
      webhookId: webhook.id,
      event,
      payload,
      attempts: 0,
    })
    .returning();

  // Attempt delivery
  await attemptDelivery(delivery!, webhook);

  // Return updated delivery
  const updated = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, delivery!.id),
  });

  return updated!;
}

/**
 * Attempt webhook delivery
 */
async function attemptDelivery(delivery: WebhookDelivery, webhook: Webhook): Promise<void> {
  const db = getDatabase();

  try {
    const payloadString = JSON.stringify(delivery.payload);
    const signature = await signWebhookPayload(payloadString, webhook.secret);

    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Webhook-Signature": signature,
        "X-Webhook-Event": delivery.event,
        "X-Webhook-Delivery-ID": delivery.id,
      },
      body: payloadString,
    });

    const responseText = await response.text();

    // Update delivery record
    await db
      .update(webhookDeliveries)
      .set({
        attempts: delivery.attempts + 1,
        statusCode: response.status,
        response: responseText.slice(0, 500), // Limit response size
        deliveredAt: response.ok ? new Date() : null,
        nextRetryAt:
          !response.ok && delivery.attempts < MAX_RETRY_ATTEMPTS
            ? new Date(Date.now() + RETRY_DELAYS[delivery.attempts]! * 1000)
            : null,
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  } catch (error) {
    // Network error or fetch failure - sanitize error to avoid leaking sensitive info
    const sanitizedResponse = (error instanceof Error ? error.message : "Unknown error")
      .replace(/Bearer\s+\S+/gi, "Bearer [REDACTED]")
      .replace(/api[_-]?key[=:]\s*\S+/gi, "api_key=[REDACTED]")
      .slice(0, 500);

    await db
      .update(webhookDeliveries)
      .set({
        attempts: delivery.attempts + 1,
        response: sanitizedResponse,
        nextRetryAt:
          delivery.attempts < MAX_RETRY_ATTEMPTS
            ? new Date(Date.now() + RETRY_DELAYS[delivery.attempts]! * 1000)
            : null,
      })
      .where(eq(webhookDeliveries.id, delivery.id));
  }
}

/**
 * Retry failed delivery
 */
export async function retryDelivery(deliveryId: string): Promise<WebhookDelivery> {
  const db = getDatabase();

  const delivery = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, deliveryId),
  });

  if (!delivery) {
    throw new NotFoundError("Webhook delivery");
  }

  if (delivery.deliveredAt) {
    throw new ValidationError("Delivery already succeeded");
  }

  const webhook = await db.query.webhooks.findFirst({
    where: eq(webhooks.id, delivery.webhookId),
  });

  if (!webhook) {
    throw new NotFoundError("Webhook");
  }

  await attemptDelivery(delivery, webhook);

  // Return updated delivery
  const updated = await db.query.webhookDeliveries.findFirst({
    where: eq(webhookDeliveries.id, delivery.id),
  });

  return updated!;
}

/**
 * Get deliveries for webhook
 */
export async function getDeliveries(
  webhookId: string,
  orgId: string,
  limit = 50
): Promise<WebhookDelivery[]> {
  const db = getDatabase();

  // Verify ownership
  await getEndpoint(webhookId, orgId);

  return db.query.webhookDeliveries.findMany({
    where: eq(webhookDeliveries.webhookId, webhookId),
    orderBy: (deliveries, { desc }) => [desc(deliveries.createdAt)],
    limit,
  });
}

/**
 * Process pending retries
 * This should be called periodically by a cron job
 */
export async function processPendingRetries(): Promise<number> {
  const db = getDatabase();

  const pendingDeliveries = await db.query.webhookDeliveries.findMany({
    where: and(
      isNull(webhookDeliveries.deliveredAt),
      or(
        isNull(webhookDeliveries.nextRetryAt),
        sql`${webhookDeliveries.nextRetryAt} <= ${new Date()}`
      ),
      sql`${webhookDeliveries.attempts} < ${MAX_RETRY_ATTEMPTS}`
    ),
    limit: 100,
  });

  if (pendingDeliveries.length === 0) return 0;

  const webhookIds = [...new Set(pendingDeliveries.map((d) => d.webhookId))];
  const webhookRows = await db.query.webhooks.findMany({
    where: inArray(webhooks.id, webhookIds),
  });
  const webhookById = new Map(webhookRows.map((w) => [w.id, w]));

  let processedCount = 0;
  for (const delivery of pendingDeliveries) {
    const webhook = webhookById.get(delivery.webhookId);
    if (webhook && webhook.isActive) {
      await attemptDelivery(delivery, webhook);
      processedCount++;
    }
  }

  return processedCount;
}
