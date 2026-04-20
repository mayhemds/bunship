/**
 * Cryptographic utilities unit tests
 *
 * Tests generateToken, generateId, hashToken, generateApiKeyPrefix,
 * generateApiKey, and generateWebhookSecret from src/lib/crypto.ts.
 */
import { describe, it, expect } from "bun:test";
import {
  generateToken,
  generateId,
  hashToken,
  generateApiKeyPrefix,
  generateApiKey,
  generateWebhookSecret,
} from "../../lib/crypto";

// ---------------------------------------------------------------------------
// generateToken
// ---------------------------------------------------------------------------
describe("generateToken", () => {
  it("returns a base64url-encoded string", () => {
    const token = generateToken();

    // base64url alphabet: A-Z a-z 0-9 - _  (no +, /, or =)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("defaults to 32 bytes (43-44 base64url chars)", () => {
    const token = generateToken();

    // 32 bytes -> ceil(32 * 4/3) = 43 base64url chars (no padding)
    expect(token.length).toBeGreaterThanOrEqual(42);
    expect(token.length).toBeLessThanOrEqual(44);
  });

  it("generates the correct length for a custom byte size", () => {
    const token16 = generateToken(16);
    // 16 bytes -> ceil(16 * 4/3) = ~22 chars
    expect(token16.length).toBeGreaterThanOrEqual(21);
    expect(token16.length).toBeLessThanOrEqual(22);

    const token64 = generateToken(64);
    // 64 bytes -> ceil(64 * 4/3) = ~86 chars
    expect(token64.length).toBeGreaterThanOrEqual(85);
    expect(token64.length).toBeLessThanOrEqual(86);
  });

  it("produces unique tokens on successive calls", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateToken()));
    expect(tokens.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------
describe("generateId", () => {
  it("returns a non-empty string", () => {
    const id = generateId();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("returns a cuid2-compatible string (lowercase alphanumeric, starts with letter)", () => {
    const id = generateId();
    // cuid2 IDs are lowercase alphanumeric and start with a letter
    expect(id).toMatch(/^[a-z][a-z0-9]+$/);
  });

  it("produces unique IDs", () => {
    const ids = new Set(Array.from({ length: 50 }, () => generateId()));
    expect(ids.size).toBe(50);
  });
});

// ---------------------------------------------------------------------------
// hashToken
// ---------------------------------------------------------------------------
describe("hashToken", () => {
  it("returns a 64-character hex string (SHA-256)", async () => {
    const hash = await hashToken("some-token-value");

    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces deterministic output for the same input", async () => {
    const hash1 = await hashToken("deterministic");
    const hash2 = await hashToken("deterministic");

    expect(hash1).toBe(hash2);
  });

  it("produces different hashes for different inputs", async () => {
    const hash1 = await hashToken("input-a");
    const hash2 = await hashToken("input-b");

    expect(hash1).not.toBe(hash2);
  });

  it("handles empty string input", async () => {
    const hash = await hashToken("");
    // SHA-256 of empty string is well-known
    expect(hash).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
});

// ---------------------------------------------------------------------------
// generateApiKeyPrefix
// ---------------------------------------------------------------------------
describe("generateApiKeyPrefix", () => {
  it("returns an 8-character lowercase alphanumeric string", () => {
    const prefix = generateApiKeyPrefix();

    expect(prefix).toMatch(/^[a-z0-9]{8}$/);
  });

  it("produces varying prefixes across calls", () => {
    const prefixes = new Set(Array.from({ length: 20 }, () => generateApiKeyPrefix()));
    // With 36^8 combinations, collisions in 20 samples are essentially impossible
    expect(prefixes.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// generateApiKey
// ---------------------------------------------------------------------------
describe("generateApiKey", () => {
  it("returns key, prefix, and hash fields", async () => {
    const result = await generateApiKey();

    expect(result).toHaveProperty("key");
    expect(result).toHaveProperty("prefix");
    expect(result).toHaveProperty("hash");
  });

  it("key starts with 'bs_' followed by the prefix content", async () => {
    const result = await generateApiKey();

    expect(result.key).toStartWith("bs_");
    // The prefix field already includes 'bs_'
    expect(result.prefix).toStartWith("bs_");
    // The key should start with the prefix value
    expect(result.key).toStartWith(result.prefix);
  });

  it("prefix is 'bs_' plus 8 lowercase alphanumeric chars", async () => {
    const result = await generateApiKey();

    // "bs_" + 8 chars = 11 chars total
    expect(result.prefix).toMatch(/^bs_[a-z0-9]{8}$/);
  });

  it("hash is a 64-character hex string (SHA-256 of the full key)", async () => {
    const result = await generateApiKey();

    expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("hash matches independently hashing the key", async () => {
    const result = await generateApiKey();
    const independentHash = await hashToken(result.key);

    expect(result.hash).toBe(independentHash);
  });

  it("produces unique keys on successive calls", async () => {
    const keys = await Promise.all(Array.from({ length: 10 }, () => generateApiKey()));
    const uniqueKeys = new Set(keys.map((k) => k.key));
    expect(uniqueKeys.size).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// generateWebhookSecret
// ---------------------------------------------------------------------------
describe("generateWebhookSecret", () => {
  it("starts with the 'whsec_' prefix", () => {
    const secret = generateWebhookSecret();

    expect(secret).toStartWith("whsec_");
  });

  it("contains a base64url token after the prefix", () => {
    const secret = generateWebhookSecret();
    const tokenPart = secret.slice("whsec_".length);

    expect(tokenPart).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(tokenPart.length).toBeGreaterThan(0);
  });

  it("produces unique secrets", () => {
    const secrets = new Set(Array.from({ length: 20 }, () => generateWebhookSecret()));
    expect(secrets.size).toBe(20);
  });
});
