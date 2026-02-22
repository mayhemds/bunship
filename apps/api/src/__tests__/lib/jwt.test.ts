/**
 * JWT utilities unit tests
 *
 * Tests signAccessToken, verifyAccessToken, signRefreshToken,
 * verifyRefreshToken, and generateTokenPair from src/lib/jwt.ts.
 */
import { describe, it, expect, beforeAll } from "bun:test";
// Env vars set by preload (bunfig.toml → helpers/env.ts)
import {
  signAccessToken,
  verifyAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  generateTokenPair,
} from "../../lib/jwt";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Not a valid JWT");
  const payload = Buffer.from(parts[1]!, "base64url").toString("utf-8");
  return JSON.parse(payload);
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("signAccessToken", () => {
  it("creates a valid JWT string with three dot-separated segments", async () => {
    const token = await signAccessToken({
      userId: "user-1",
      email: "alice@example.com",
      sessionId: "sess-1",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("embeds userId, email, and sessionId in the payload", async () => {
    const token = await signAccessToken({
      userId: "user-42",
      email: "bob@example.com",
      sessionId: "sess-99",
    });

    const payload = decodeJwtPayload(token);
    expect(payload.userId).toBe("user-42");
    expect(payload.email).toBe("bob@example.com");
    expect(payload.sessionId).toBe("sess-99");
  });

  it("sets the issuer to 'bunship'", async () => {
    const token = await signAccessToken({
      userId: "u1",
      email: "a@b.com",
      sessionId: "s1",
    });

    const payload = decodeJwtPayload(token);
    expect(payload.iss).toBe("bunship");
  });

  it("sets an expiration roughly 15 minutes from now", async () => {
    const beforeSign = Math.floor(Date.now() / 1000);
    const token = await signAccessToken({
      userId: "u1",
      email: "a@b.com",
      sessionId: "s1",
    });
    const afterSign = Math.floor(Date.now() / 1000);

    const payload = decodeJwtPayload(token);
    const exp = payload.exp as number;
    const fifteenMinutes = 15 * 60;

    // exp should be within a small tolerance of (iat + 900)
    expect(exp).toBeGreaterThanOrEqual(beforeSign + fifteenMinutes - 2);
    expect(exp).toBeLessThanOrEqual(afterSign + fifteenMinutes + 2);
  });
});

describe("verifyAccessToken", () => {
  it("returns the correct payload for a valid token", async () => {
    const token = await signAccessToken({
      userId: "user-abc",
      email: "carol@example.com",
      sessionId: "sess-xyz",
    });

    const payload = await verifyAccessToken(token);

    expect(payload.userId).toBe("user-abc");
    expect(payload.email).toBe("carol@example.com");
    expect(payload.sessionId).toBe("sess-xyz");
    expect(payload.iss).toBe("bunship");
  });

  it("rejects a tampered token", async () => {
    const token = await signAccessToken({
      userId: "user-1",
      email: "a@b.com",
      sessionId: "s1",
    });

    // Flip a character in the signature (last segment)
    const parts = token.split(".");
    const sig = parts[2]!;
    const flipped = sig[0] === "A" ? "B" + sig.slice(1) : "A" + sig.slice(1);
    const tampered = [parts[0], parts[1], flipped].join(".");

    expect(verifyAccessToken(tampered)).rejects.toThrow();
  });

  it("rejects a completely invalid string", async () => {
    expect(verifyAccessToken("not-a-jwt")).rejects.toThrow();
  });

  it("rejects a token signed with a different secret", async () => {
    // A refresh token is signed with a different secret -- verifyAccessToken should reject it
    const refreshToken = await signRefreshToken({
      userId: "user-1",
      sessionId: "s1",
    });

    expect(verifyAccessToken(refreshToken)).rejects.toThrow();
  });
});

describe("signRefreshToken", () => {
  it("creates a valid JWT string", async () => {
    const token = await signRefreshToken({
      userId: "user-1",
      sessionId: "sess-1",
    });

    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3);
  });

  it("embeds userId and sessionId in the payload", async () => {
    const token = await signRefreshToken({
      userId: "user-77",
      sessionId: "sess-33",
    });

    const payload = decodeJwtPayload(token);
    expect(payload.userId).toBe("user-77");
    expect(payload.sessionId).toBe("sess-33");
  });

  it("does NOT include email in the payload", async () => {
    const token = await signRefreshToken({
      userId: "user-1",
      sessionId: "sess-1",
    });

    const payload = decodeJwtPayload(token);
    expect(payload.email).toBeUndefined();
  });

  it("sets an expiration roughly 7 days from now", async () => {
    const beforeSign = Math.floor(Date.now() / 1000);
    const token = await signRefreshToken({
      userId: "u1",
      sessionId: "s1",
    });
    const afterSign = Math.floor(Date.now() / 1000);

    const payload = decodeJwtPayload(token);
    const exp = payload.exp as number;
    const sevenDays = 7 * 24 * 60 * 60;

    expect(exp).toBeGreaterThanOrEqual(beforeSign + sevenDays - 2);
    expect(exp).toBeLessThanOrEqual(afterSign + sevenDays + 2);
  });
});

describe("verifyRefreshToken", () => {
  it("returns the correct payload for a valid refresh token", async () => {
    const token = await signRefreshToken({
      userId: "user-refresh",
      sessionId: "sess-refresh",
    });

    const payload = await verifyRefreshToken(token);

    expect(payload.userId).toBe("user-refresh");
    expect(payload.sessionId).toBe("sess-refresh");
    expect(payload.iss).toBe("bunship");
  });

  it("rejects an access token (different secret)", async () => {
    const accessToken = await signAccessToken({
      userId: "user-1",
      email: "a@b.com",
      sessionId: "s1",
    });

    expect(verifyRefreshToken(accessToken)).rejects.toThrow();
  });

  it("rejects a tampered refresh token", async () => {
    const token = await signRefreshToken({
      userId: "user-1",
      sessionId: "s1",
    });

    const tampered = token.slice(0, -4) + "XXXX";
    expect(verifyRefreshToken(tampered)).rejects.toThrow();
  });
});

describe("generateTokenPair", () => {
  it("returns an object with accessToken and refreshToken strings", async () => {
    const pair = await generateTokenPair({
      id: "user-1",
      email: "pair@example.com",
      sessionId: "sess-pair",
    });

    expect(typeof pair.accessToken).toBe("string");
    expect(typeof pair.refreshToken).toBe("string");
    expect(pair.accessToken).not.toBe(pair.refreshToken);
  });

  it("access token contains userId, email, and sessionId", async () => {
    const pair = await generateTokenPair({
      id: "user-pair",
      email: "pair@example.com",
      sessionId: "sess-pair",
    });

    const payload = await verifyAccessToken(pair.accessToken);
    expect(payload.userId).toBe("user-pair");
    expect(payload.email).toBe("pair@example.com");
    expect(payload.sessionId).toBe("sess-pair");
  });

  it("refresh token contains userId and sessionId but not email", async () => {
    const pair = await generateTokenPair({
      id: "user-pair",
      email: "pair@example.com",
      sessionId: "sess-pair",
    });

    const payload = await verifyRefreshToken(pair.refreshToken);
    expect(payload.userId).toBe("user-pair");
    expect(payload.sessionId).toBe("sess-pair");
    expect((payload as any).email).toBeUndefined();
  });

  it("both tokens are independently verifiable", async () => {
    const pair = await generateTokenPair({
      id: "user-1",
      email: "verify@example.com",
      sessionId: "sess-1",
    });

    const accessPayload = await verifyAccessToken(pair.accessToken);
    const refreshPayload = await verifyRefreshToken(pair.refreshToken);

    expect(accessPayload.userId).toBe(refreshPayload.userId);
    expect(accessPayload.sessionId).toBe(refreshPayload.sessionId);
  });
});
