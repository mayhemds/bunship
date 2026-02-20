/**
 * API Key Service
 * Handles API key generation, validation, and management
 */
// Use Web Crypto API (Bun-native) instead of Node's crypto module
import { getDatabase, apiKeys, eq, and } from "@bunship/database";
import { NotFoundError, AuthenticationError } from "@bunship/utils";
import type { ApiKey } from "@bunship/database";

const KEY_PREFIX = "bunship";

/**
 * Generate API key
 * Format: bunship_live_[32 random hex chars] or bunship_test_[32 random hex chars]
 */
export async function generateApiKey(mode: "live" | "test" = "live"): Promise<{
  key: string;
  prefix: string;
  hash: string;
}> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const randomPart = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  const key = `${KEY_PREFIX}_${mode}_${randomPart}`;
  const prefix = `${KEY_PREFIX}_${mode}_${randomPart.slice(0, 8)}`;
  const hash = await hashApiKey(key);

  return { key, prefix, hash };
}

/**
 * Hash API key for storage
 */
export async function hashApiKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer), (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create API key
 */
export async function createApiKey(
  orgId: string,
  userId: string,
  data: {
    name: string;
    scopes?: string[];
    rateLimit?: number;
    expiresAt?: Date;
  }
): Promise<{ apiKey: ApiKey; plainKey: string }> {
  const db = getDatabase();

  const { key, prefix, hash } = await generateApiKey();

  const [apiKey] = await db
    .insert(apiKeys)
    .values({
      organizationId: orgId,
      name: data.name,
      keyPrefix: prefix,
      keyHash: hash,
      scopes: data.scopes || [],
      rateLimit: data.rateLimit || null,
      expiresAt: data.expiresAt || null,
      isActive: true,
      createdBy: userId,
    })
    .returning();

  // Return the API key object with the plain key (only shown once)
  return {
    apiKey: apiKey!,
    plainKey: key,
  };
}

/**
 * List API keys for organization
 */
export async function listApiKeys(orgId: string): Promise<ApiKey[]> {
  const db = getDatabase();

  return db.query.apiKeys.findMany({
    where: eq(apiKeys.organizationId, orgId),
    orderBy: (keys, { desc }) => [desc(keys.createdAt)],
  });
}

/**
 * Get API key by ID
 */
export async function getApiKey(keyId: string, orgId: string): Promise<ApiKey> {
  const db = getDatabase();

  const key = await db.query.apiKeys.findFirst({
    where: and(eq(apiKeys.id, keyId), eq(apiKeys.organizationId, orgId)),
  });

  if (!key) {
    throw new NotFoundError("API key");
  }

  return key;
}

/**
 * Revoke (delete) API key
 */
export async function revokeApiKey(keyId: string, orgId: string): Promise<void> {
  const db = getDatabase();

  // Verify ownership
  await getApiKey(keyId, orgId);

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId));
}

/**
 * Validate API key and return associated organization
 */
export async function validateApiKey(
  key: string
): Promise<{ apiKey: ApiKey; organizationId: string }> {
  const db = getDatabase();

  const hash = await hashApiKey(key);

  const apiKey = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.keyHash, hash),
  });

  if (!apiKey) {
    throw new AuthenticationError("Invalid API key");
  }

  if (!apiKey.isActive) {
    throw new AuthenticationError("API key is inactive");
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    throw new AuthenticationError("API key has expired");
  }

  // Update last used timestamp
  await db.update(apiKeys).set({ lastUsedAt: new Date() }).where(eq(apiKeys.id, apiKey.id));

  return {
    apiKey,
    organizationId: apiKey.organizationId,
  };
}

/**
 * Check if API key has required scope
 */
export function hasScope(apiKey: ApiKey, requiredScope: string): boolean {
  // If no scopes defined, deny access (matches middleware deny-by-default)
  if (!apiKey.scopes || apiKey.scopes.length === 0) {
    return false;
  }

  return apiKey.scopes.includes(requiredScope);
}

/**
 * Get usage statistics for API key
 */
export async function getApiKeyUsage(keyId: string, orgId: string) {
  const db = getDatabase();

  const key = await getApiKey(keyId, orgId);

  // Count requests from audit logs (if tracking API key usage)
  // This is a placeholder - you'd need to implement actual usage tracking
  const requestCount = 0;

  return {
    keyId: key.id,
    name: key.name,
    prefix: key.keyPrefix,
    lastUsedAt: key.lastUsedAt,
    createdAt: key.createdAt,
    usage: {
      requests: requestCount,
      rateLimit: key.rateLimit,
    },
  };
}
