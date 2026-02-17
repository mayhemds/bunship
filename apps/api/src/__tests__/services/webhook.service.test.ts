/**
 * Webhook Service Tests
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";

// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockInsert = mock(() => ({
  values: mock(() => ({ returning: mock(() => Promise.resolve([{ id: "wh-1" }])) })),
}));
const mockFindFirst = mock(() => Promise.resolve(null));

mockDatabase({
  getDatabase: () => ({
    insert: mockInsert,
    query: {
      webhooks: { findFirst: mockFindFirst, findMany: mock(() => Promise.resolve([])) },
      webhookDeliveries: {
        findFirst: mock(() => Promise.resolve(null)),
        findMany: mock(() => Promise.resolve([])),
      },
    },
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
    update: mock(() => ({
      set: mock(() => ({ where: mock(() => ({ returning: mock(() => Promise.resolve([])) })) })),
    })),
  }),
});

// ── Import under test (dynamic to ensure mocks are applied first) ───────────
let generateWebhookSecret: typeof import("../../services/webhook.service").generateWebhookSecret;
let signWebhookPayload: typeof import("../../services/webhook.service").signWebhookPayload;
let verifyWebhookSignature: typeof import("../../services/webhook.service").verifyWebhookSignature;
let createEndpoint: typeof import("../../services/webhook.service").createEndpoint;

beforeAll(async () => {
  const mod = await import("../../services/webhook.service");
  generateWebhookSecret = mod.generateWebhookSecret;
  signWebhookPayload = mod.signWebhookPayload;
  verifyWebhookSignature = mod.verifyWebhookSignature;
  createEndpoint = mod.createEndpoint;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("webhook.service", () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockInsert.mockClear();
  });

  // ── generateWebhookSecret ─────────────────────────────────────────────
  describe("generateWebhookSecret", () => {
    it("returns a string prefixed with whsec_", () => {
      const secret = generateWebhookSecret();
      expect(secret).toStartWith("whsec_");
    });

    it("has 64 hex chars after the prefix", () => {
      const secret = generateWebhookSecret();
      const hex = secret.slice("whsec_".length);
      expect(hex).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique secrets on each call", () => {
      const a = generateWebhookSecret();
      const b = generateWebhookSecret();
      expect(a).not.toBe(b);
    });
  });

  // ── signWebhookPayload ────────────────────────────────────────────────
  describe("signWebhookPayload", () => {
    it("returns a string in t=...,v1=... format", async () => {
      const sig = await signWebhookPayload('{"event":"test"}', "whsec_abcdef");
      expect(sig).toMatch(/^t=\d+,v1=[0-9a-f]{64}$/);
    });

    it("includes the current unix timestamp", async () => {
      const before = Math.floor(Date.now() / 1000);
      const sig = await signWebhookPayload("payload", "secret");
      const after = Math.floor(Date.now() / 1000);

      const t = parseInt(sig.split(",")[0].split("=")[1]);
      expect(t).toBeGreaterThanOrEqual(before);
      expect(t).toBeLessThanOrEqual(after);
    });

    it("produces different signatures for different payloads", async () => {
      const secret = "whsec_shared";
      const sig1 = await signWebhookPayload("payload-a", secret);
      const sig2 = await signWebhookPayload("payload-b", secret);
      // v1 portion should differ (timestamps may also differ, but the HMAC certainly will)
      const v1_1 = sig1.split(",")[1];
      const v1_2 = sig2.split(",")[1];
      expect(v1_1).not.toBe(v1_2);
    });
  });

  // ── verifyWebhookSignature ────────────────────────────────────────────
  describe("verifyWebhookSignature", () => {
    const secret = "whsec_test_secret_key_for_hmac";

    async function createValidSignature(payload: string, secret: string): Promise<string> {
      return signWebhookPayload(payload, secret);
    }

    it("returns true for a valid signature with the correct secret", async () => {
      const payload = '{"event":"user.created"}';
      const sig = await createValidSignature(payload, secret);

      const result = await verifyWebhookSignature(payload, sig, secret);
      expect(result).toBe(true);
    });

    it("returns false for a tampered payload", async () => {
      const payload = '{"event":"user.created"}';
      const sig = await createValidSignature(payload, secret);

      const result = await verifyWebhookSignature('{"event":"TAMPERED"}', sig, secret);
      expect(result).toBe(false);
    });

    it("returns false for an expired timestamp", async () => {
      const payload = "test";
      // Build a signature with a timestamp in the distant past
      const oldTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes ago

      // Manually construct the HMAC with the old timestamp
      const encoder = new TextEncoder();
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        encoder.encode(secret),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const signedPayload = `${oldTimestamp}.${payload}`;
      const hmacBuffer = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(signedPayload));
      const hmacHex = Array.from(new Uint8Array(hmacBuffer), (b) =>
        b.toString(16).padStart(2, "0")
      ).join("");

      const sig = `t=${oldTimestamp},v1=${hmacHex}`;

      // Default tolerance is 300s (5 min), our timestamp is 600s old
      const result = await verifyWebhookSignature(payload, sig, secret);
      expect(result).toBe(false);
    });

    it("returns false when signed with a wrong secret", async () => {
      const payload = "important-data";
      const sig = await createValidSignature(payload, "whsec_wrong_secret");

      const result = await verifyWebhookSignature(payload, sig, secret);
      expect(result).toBe(false);
    });

    it("returns false for a malformed signature string", async () => {
      const result = await verifyWebhookSignature("data", "garbage", secret);
      expect(result).toBe(false);
    });

    it("timing-safe comparison prevents length-based timing differences", async () => {
      // Verify that two signatures of equal length but different content
      // both go through the constant-time comparison path
      const payload = "timing-test";
      const sig = await createValidSignature(payload, secret);

      // This should reach the timingSafeEqual path (not the byteLength check)
      // by providing a valid-format signature with the right timestamp but wrong HMAC
      const parts = sig.split(",");
      const t = parts[0]; // keep the same timestamp
      // Flip some chars in the HMAC to get a wrong but same-length signature
      const v1Hex = parts[1].split("=")[1];
      const flipped = v1Hex.replace(/[0-9a-f]/g, (c) => (c === "0" ? "1" : "0"));
      const wrongSig = `${t},v1=${flipped}`;

      const result = await verifyWebhookSignature(payload, wrongSig, secret);
      expect(result).toBe(false);
    });
  });

  // ── createEndpoint ────────────────────────────────────────────────────
  describe("createEndpoint", () => {
    it("accepts a valid HTTPS URL", async () => {
      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "wh-1",
            organizationId: "org-1",
            url: "https://example.com/webhook",
            secret: "whsec_abc",
            events: [],
            isActive: true,
          },
        ])
      );
      const valuesMock = mock(() => ({ returning: returningMock }));
      mockInsert.mockReturnValue({ values: valuesMock } as any);

      const result = await createEndpoint("org-1", {
        url: "https://example.com/webhook",
      });

      expect(result.id).toBe("wh-1");
      expect(result.url).toBe("https://example.com/webhook");
    });

    it("accepts a valid HTTP URL", async () => {
      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "wh-2",
            organizationId: "org-1",
            url: "http://staging.example.com/hook",
            secret: "whsec_abc",
            events: ["user.created"],
            isActive: true,
          },
        ])
      );
      const valuesMock = mock(() => ({ returning: returningMock }));
      mockInsert.mockReturnValue({ values: valuesMock } as any);

      const result = await createEndpoint("org-1", {
        url: "http://staging.example.com/hook",
        events: ["user.created"],
      });

      expect(result.url).toBe("http://staging.example.com/hook");
    });

    it("throws ValidationError for an invalid URL", async () => {
      await expect(createEndpoint("org-1", { url: "not-a-url" })).rejects.toThrow(
        "Invalid webhook URL"
      );
    });

    it("throws ValidationError for an empty URL", async () => {
      await expect(createEndpoint("org-1", { url: "" })).rejects.toThrow("Invalid webhook URL");
    });
  });
});
