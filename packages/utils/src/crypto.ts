/**
 * Cryptographic utilities for secure random generation and hashing
 */

import { createId } from "@paralleldrive/cuid2";

/**
 * Generate a secure random token
 * Uses crypto.getRandomValues for cryptographically secure randomness
 * @param byteLength - Number of random bytes to generate (default: 32)
 * @returns Base64URL-encoded random string
 */
export function generateToken(byteLength = 32): string {
  const buffer = new Uint8Array(byteLength);
  crypto.getRandomValues(buffer);

  // Convert to base64url encoding (URL-safe)
  return btoa(String.fromCharCode(...buffer))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

/**
 * Generate a unique ID using CUID2
 * CUIDs are collision-resistant, horizontally scalable, and sortable
 * @returns A unique identifier string
 */
export function generateId(): string {
  return createId();
}

/**
 * Hash a token using SHA-256
 * Use this to store hashed versions of sensitive tokens in the database
 * @param token - The token to hash
 * @returns Hex-encoded SHA-256 hash
 */
export async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Generate a random prefix for API keys
 * Creates an 8-character random string for key identification
 * @returns Random alphanumeric string
 */
export function generateApiKeyPrefix(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const length = 8;
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i]! % chars.length];
  }
  return result;
}

/**
 * Generate a secure API key with prefix
 * Format: {prefix}_{randomToken}
 * @param prefix - Key prefix (e.g., 'pk_' for production, 'sk_' for secret)
 * @returns Formatted API key
 */
export function generateApiKey(prefix = "pk"): string {
  const token = generateToken(32);
  const suffix = generateApiKeyPrefix();
  return `${prefix}_${suffix}_${token}`;
}

/**
 * Generate a numeric OTP (One-Time Password)
 * @param length - Number of digits (default: 6)
 * @returns Numeric string of specified length
 */
export function generateOTP(length = 6): string {
  const max = Math.pow(10, length);
  const buffer = new Uint32Array(1);
  crypto.getRandomValues(buffer);
  const num = buffer[0]! % max;
  return num.toString().padStart(length, "0");
}

/**
 * Generate a cryptographically secure random integer between min and max (inclusive)
 * @param min - Minimum value (inclusive)
 * @param max - Maximum value (inclusive)
 * @returns Random integer
 */
export function randomInt(min: number, max: number): number {
  const range = max - min + 1;
  const bytesNeeded = Math.ceil(Math.log2(range) / 8);
  const maxValue = Math.pow(256, bytesNeeded);
  const buffer = new Uint8Array(bytesNeeded);

  let value: number;
  do {
    crypto.getRandomValues(buffer);
    value = 0;
    for (let i = 0; i < bytesNeeded; i++) {
      value = value * 256 + buffer[i]!;
    }
  } while (value >= maxValue - (maxValue % range));

  return min + (value % range);
}

/**
 * Generate a random alphanumeric string
 * @param length - Length of string to generate
 * @returns Random alphanumeric string
 */
export function generateRandomString(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomBytes = new Uint8Array(length);
  crypto.getRandomValues(randomBytes);

  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i]! % chars.length];
  }
  return result;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Use this when comparing sensitive values like tokens or hashes
 * @param a - First string
 * @param b - Second string
 * @returns true if strings are equal
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}
