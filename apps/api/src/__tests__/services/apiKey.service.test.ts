/**
 * API Key Service Tests
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";

// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockInsert = mock(() => ({
  values: mock(() => ({
    returning: mock(() =>
      Promise.resolve([
        {
          id: "key-1",
          organizationId: "org-1",
          name: "Test Key",
          keyPrefix: "bunship_live_abcd1234",
          keyHash: "abc123hash",
          scopes: ["read", "write"],
          rateLimit: null,
          expiresAt: null,
          isActive: true,
          createdBy: "user-1",
          lastUsedAt: null,
          createdAt: new Date(),
        },
      ])
    ),
  })),
}));
const mockDelete = mock(() => ({ where: mock(() => Promise.resolve()) }));
const mockUpdate = mock(() => ({ set: mock(() => ({ where: mock(() => Promise.resolve()) })) }));
const mockFindFirst = mock(() => Promise.resolve(null));
const mockFindMany = mock(() => Promise.resolve([]));

mockDatabase({
  getDatabase: () => ({
    insert: mockInsert,
    delete: mockDelete,
    update: mockUpdate,
    query: {
      apiKeys: {
        findFirst: mockFindFirst,
        findMany: mockFindMany,
      },
    },
  }),
});

// ── Import under test (dynamic to ensure mocks are applied first) ───────────
let generateApiKey: typeof import("../../services/apiKey.service").generateApiKey;
let hashApiKey: typeof import("../../services/apiKey.service").hashApiKey;
let createApiKey: typeof import("../../services/apiKey.service").createApiKey;
let validateApiKey: typeof import("../../services/apiKey.service").validateApiKey;
let revokeApiKey: typeof import("../../services/apiKey.service").revokeApiKey;
let hasScope: typeof import("../../services/apiKey.service").hasScope;

beforeAll(async () => {
  const mod = await import("../../services/apiKey.service");
  generateApiKey = mod.generateApiKey;
  hashApiKey = mod.hashApiKey;
  createApiKey = mod.createApiKey;
  validateApiKey = mod.validateApiKey;
  revokeApiKey = mod.revokeApiKey;
  hasScope = mod.hasScope;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("apiKey.service", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockInsert.mockClear();
    mockDelete.mockClear();
    mockUpdate.mockClear();
  });

  // ── generateApiKey ──────────────────────────────────────────────────────
  describe("generateApiKey", () => {
    it("returns key, prefix, and hash", async () => {
      const result = await generateApiKey();

      expect(result).toHaveProperty("key");
      expect(result).toHaveProperty("prefix");
      expect(result).toHaveProperty("hash");
    });

    it("key starts with bunship_live_ by default", async () => {
      const result = await generateApiKey();
      expect(result.key).toStartWith("bunship_live_");
    });

    it("key starts with bunship_test_ when mode is test", async () => {
      const result = await generateApiKey("test");
      expect(result.key).toStartWith("bunship_test_");
    });

    it("prefix is the key prefix up to first 8 hex chars of random part", async () => {
      const result = await generateApiKey();
      // prefix format: bunship_live_XXXXXXXX (first 8 hex chars)
      expect(result.prefix).toMatch(/^bunship_live_[0-9a-f]{8}$/);
    });

    it("key contains 64 hex chars in the random portion", async () => {
      const result = await generateApiKey();
      // Format: bunship_live_[64 hex chars]
      const parts = result.key.split("_");
      // parts[0] = "bunship", parts[1] = "live", parts[2] = hex
      expect(parts[2]).toMatch(/^[0-9a-f]{64}$/);
    });

    it("hash is a 64-char hex string (SHA-256)", async () => {
      const result = await generateApiKey();
      expect(result.hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique keys on each call", async () => {
      const a = await generateApiKey();
      const b = await generateApiKey();
      expect(a.key).not.toBe(b.key);
      expect(a.hash).not.toBe(b.hash);
    });
  });

  // ── hashApiKey ──────────────────────────────────────────────────────────
  describe("hashApiKey", () => {
    it("produces a 64-char hex string (SHA-256)", async () => {
      const hash = await hashApiKey("bunship_live_deadbeef01234567");
      expect(hash).toMatch(/^[0-9a-f]{64}$/);
    });

    it("produces consistent output for the same input", async () => {
      const input = "bunship_live_abc123";
      const hash1 = await hashApiKey(input);
      const hash2 = await hashApiKey(input);
      expect(hash1).toBe(hash2);
    });

    it("produces different output for different inputs", async () => {
      const hash1 = await hashApiKey("key-one");
      const hash2 = await hashApiKey("key-two");
      expect(hash1).not.toBe(hash2);
    });
  });

  // ── createApiKey ────────────────────────────────────────────────────────
  describe("createApiKey", () => {
    it("stores the hashed key, never the plaintext", async () => {
      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "key-1",
            organizationId: "org-1",
            name: "My Key",
            keyPrefix: "bunship_live_abcd1234",
            keyHash: "hashed_value",
            scopes: [],
            rateLimit: null,
            expiresAt: null,
            isActive: true,
            createdBy: "user-1",
            lastUsedAt: null,
            createdAt: new Date(),
          },
        ])
      );
      const valuesMock = mock(() => ({ returning: returningMock }));
      mockInsert.mockReturnValue({ values: valuesMock } as any);

      const result = await createApiKey("org-1", "user-1", { name: "My Key" });

      // The returned plainKey must be present and the full key
      expect(result.plainKey).toStartWith("bunship_live_");
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.id).toBe("key-1");

      // The values call should include keyHash but never the raw key
      const insertedValues = valuesMock.mock.calls[0][0] as Record<string, unknown>;
      expect(insertedValues).toHaveProperty("keyHash");
      expect(insertedValues.keyHash).toMatch(/^[0-9a-f]{64}$/);
      // Ensure the plaintext key is not stored in any column
      expect(insertedValues).not.toHaveProperty("key");
      expect(insertedValues).not.toHaveProperty("plainKey");
    });
  });

  // ── validateApiKey ──────────────────────────────────────────────────────
  describe("validateApiKey", () => {
    it("returns apiKey and organizationId for a valid key", async () => {
      const fakeApiKey = {
        id: "key-1",
        organizationId: "org-1",
        name: "Valid Key",
        keyPrefix: "bunship_live_aabbccdd",
        keyHash: "", // will be matched by mock
        scopes: ["read"],
        rateLimit: null,
        expiresAt: null,
        isActive: true,
        createdBy: "user-1",
        lastUsedAt: null,
        createdAt: new Date(),
      };

      mockFindFirst.mockResolvedValueOnce(fakeApiKey);

      const setMock = mock(() => ({ where: mock(() => Promise.resolve()) }));
      mockUpdate.mockReturnValue({ set: setMock } as any);

      const result = await validateApiKey(
        "bunship_live_aabbccdd12345678901234567890123456789012345678901234567890ab"
      );

      expect(result.apiKey.id).toBe("key-1");
      expect(result.organizationId).toBe("org-1");
    });

    it("throws AuthenticationError for an invalid (unknown) key", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      await expect(validateApiKey("bunship_live_unknown")).rejects.toThrow("Invalid API key");
    });

    it("throws AuthenticationError for an inactive key", async () => {
      mockFindFirst.mockResolvedValueOnce({
        id: "key-2",
        organizationId: "org-1",
        isActive: false,
        expiresAt: null,
      });

      await expect(validateApiKey("bunship_live_inactive")).rejects.toThrow("API key is inactive");
    });

    it("throws AuthenticationError for an expired key", async () => {
      const pastDate = new Date("2020-01-01T00:00:00Z");
      mockFindFirst.mockResolvedValueOnce({
        id: "key-3",
        organizationId: "org-1",
        isActive: true,
        expiresAt: pastDate,
      });

      await expect(validateApiKey("bunship_live_expired")).rejects.toThrow("API key has expired");
    });
  });

  // ── revokeApiKey ────────────────────────────────────────────────────────
  describe("revokeApiKey", () => {
    it("deletes the key after verifying ownership", async () => {
      // getApiKey (called inside revokeApiKey) needs findFirst to return a key
      mockFindFirst.mockResolvedValueOnce({
        id: "key-1",
        organizationId: "org-1",
        name: "To Revoke",
      });

      const whereMock = mock(() => Promise.resolve());
      mockDelete.mockReturnValue({ where: whereMock } as any);

      await revokeApiKey("key-1", "org-1");

      expect(mockDelete).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
    });

    it("throws NotFoundError if key does not exist", async () => {
      mockFindFirst.mockResolvedValueOnce(null);

      await expect(revokeApiKey("nonexistent", "org-1")).rejects.toThrow("not found");
    });
  });

  // ── hasScope ────────────────────────────────────────────────────────────
  describe("hasScope", () => {
    it("returns true when the key has the required scope", () => {
      const apiKey = { scopes: ["read", "write", "admin"] } as any;
      expect(hasScope(apiKey, "write")).toBe(true);
    });

    it("returns false when the key lacks the required scope", () => {
      const apiKey = { scopes: ["read"] } as any;
      expect(hasScope(apiKey, "admin")).toBe(false);
    });

    it("returns false when scopes array is empty (deny-by-default)", () => {
      const apiKey = { scopes: [] } as any;
      expect(hasScope(apiKey, "anything")).toBe(false);
    });

    it("returns false when scopes is null (deny-by-default)", () => {
      const apiKey = { scopes: null } as any;
      expect(hasScope(apiKey, "anything")).toBe(false);
    });

    it("returns false when scopes is undefined (deny-by-default)", () => {
      const apiKey = { scopes: undefined } as any;
      expect(hasScope(apiKey, "anything")).toBe(false);
    });
  });
});
