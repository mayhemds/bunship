/**
 * Cryptographic utilities
 */
import { createId } from "@paralleldrive/cuid2";

/**
 * Generate a secure random token (base64url encoded)
 */
export function generateToken(bytes: number = 32): string {
  const buffer = new Uint8Array(bytes);
  crypto.getRandomValues(buffer);
  return Buffer.from(buffer).toString("base64url");
}

/**
 * Generate a cuid2 ID
 */
export function generateId(): string {
  return createId();
}

/**
 * Hash a token using SHA-256
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Buffer.from(hashBuffer).toString("hex");
}

/**
 * Generate an API key prefix (visible part)
 */
export function generateApiKeyPrefix(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const buffer = new Uint8Array(8);
  crypto.getRandomValues(buffer);
  for (let i = 0; i < 8; i++) {
    result += chars[buffer[i]! % chars.length];
  }
  return result;
}

/**
 * Generate a full API key with prefix
 * Returns: { key: full key to give user, prefix: visible prefix, hash: to store }
 */
export async function generateApiKey(): Promise<{
  key: string;
  prefix: string;
  hash: string;
}> {
  const prefix = generateApiKeyPrefix();
  const secret = generateToken(24);
  const key = `bs_${prefix}_${secret}`;
  const hash = await hashToken(key);
  return { key, prefix: `bs_${prefix}`, hash };
}

/**
 * Generate a webhook signing secret
 */
export function generateWebhookSecret(): string {
  return `whsec_${generateToken(32)}`;
}

/**
 * HMAC-SHA256 hash (keyed hash, resistant to rainbow tables)
 */
export async function hmacHash(key: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
  return Buffer.from(signature).toString("hex");
}

/**
 * Encrypt a string with AES-256-GCM.
 * Returns base64-encoded "iv:ciphertext" (IV is 12 bytes, prepended).
 */
export async function encryptSecret(plaintext: string, keyMaterial: string): Promise<string> {
  const encoder = new TextEncoder();
  // Derive a 256-bit key from keyMaterial via SHA-256
  const rawKey = await crypto.subtle.digest("SHA-256", encoder.encode(keyMaterial));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext)
  );
  // Concatenate iv + ciphertext and base64 encode
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);
  return Buffer.from(combined).toString("base64");
}

/**
 * Decrypt a string encrypted with encryptSecret.
 */
export async function decryptSecret(encrypted: string, keyMaterial: string): Promise<string> {
  const encoder = new TextEncoder();
  const rawKey = await crypto.subtle.digest("SHA-256", encoder.encode(keyMaterial));
  const key = await crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["decrypt"]);
  const combined = Buffer.from(encrypted, "base64");
  const iv = combined.subarray(0, 12);
  const ciphertext = combined.subarray(12);
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(plaintext);
}
