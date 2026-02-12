/**
 * Auth Middleware Tests
 */
import { describe, it, expect, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";
import { Elysia } from "elysia";
import { AuthenticationError } from "@bunship/utils";

// ── Mock JWT verification ───────────────────────────────────────────────────
const mockVerifyAccessToken = mock(() =>
  Promise.resolve({
    userId: "user-1",
    email: "test@example.com",
    sessionId: "session-1",
  })
);

mock.module("../../lib/jwt", () => ({
  verifyAccessToken: mockVerifyAccessToken,
}));

// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockFindFirst = mock(() =>
  Promise.resolve({
    id: "user-1",
    email: "test@example.com",
    fullName: "Test User",
    isActive: true,
  })
);

mockDatabase({
  getDatabase: () => ({
    query: {
      users: { findFirst: mockFindFirst },
    },
  }),
});

// ── Import under test ───────────────────────────────────────────────────────
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth";

// ── Helper: build a test Elysia app with the middleware ─────────────────────
function createTestApp() {
  return new Elysia()
    .use(authMiddleware)
    .get("/protected", ({ user }) => ({ userId: user.id, email: user.email }))
    .onError(({ error, set }) => {
      if (error instanceof AuthenticationError) {
        set.status = 401;
        return error.toJSON();
      }
      set.status = 500;
      return { error: { message: error.message } };
    });
}

function createOptionalAuthApp() {
  return new Elysia()
    .use(optionalAuthMiddleware)
    .get("/public", ({ user }) => ({
      authenticated: user !== null,
      userId: user?.id ?? null,
    }))
    .onError(({ error, set }) => {
      set.status = 500;
      return { error: { message: error.message } };
    });
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("authMiddleware", () => {
  beforeEach(() => {
    mockVerifyAccessToken.mockReset();
    mockVerifyAccessToken.mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
      sessionId: "session-1",
    });
    mockFindFirst.mockReset();
    mockFindFirst.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      fullName: "Test User",
      isActive: true,
    });
  });

  it("returns 401 when no Authorization header is provided", async () => {
    const app = createTestApp();

    const response = await app.handle(new Request("http://localhost/protected"));

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text.toLowerCase()).toContain("authorization");
  });

  it("returns 401 for a non-Bearer Authorization header", async () => {
    const app = createTestApp();

    const response = await app.handle(
      new Request("http://localhost/protected", {
        headers: { authorization: "Basic dXNlcjpwYXNz" },
      })
    );

    expect(response.status).toBe(401);
  });

  it("returns 401 for an invalid/expired Bearer token", async () => {
    mockVerifyAccessToken.mockRejectedValueOnce(new Error("Token expired"));

    const app = createTestApp();

    const response = await app.handle(
      new Request("http://localhost/protected", {
        headers: { authorization: "Bearer invalid_token_here" },
      })
    );

    expect(response.status).toBe(401);
  });

  it("sets user in context for a valid token", async () => {
    const app = createTestApp();

    const response = await app.handle(
      new Request("http://localhost/protected", {
        headers: { authorization: "Bearer valid_token" },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.userId).toBe("user-1");
    expect(body.email).toBe("test@example.com");
  });

  it("passes the token (without 'Bearer ') to verifyAccessToken", async () => {
    const app = createTestApp();

    await app.handle(
      new Request("http://localhost/protected", {
        headers: { authorization: "Bearer my_jwt_token_abc" },
      })
    );

    expect(mockVerifyAccessToken).toHaveBeenCalledWith("my_jwt_token_abc");
  });
});

describe("optionalAuthMiddleware", () => {
  beforeEach(() => {
    mockVerifyAccessToken.mockReset();
    mockVerifyAccessToken.mockResolvedValue({
      userId: "user-1",
      email: "test@example.com",
      sessionId: "session-1",
    });
    mockFindFirst.mockReset();
    mockFindFirst.mockResolvedValue({
      id: "user-1",
      email: "test@example.com",
      fullName: "Test User",
      isActive: true,
    });
  });

  it("does not throw when no Authorization header is provided", async () => {
    const app = createOptionalAuthApp();

    const response = await app.handle(new Request("http://localhost/public"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.userId).toBeNull();
  });

  it("sets user to null for a non-Bearer header", async () => {
    const app = createOptionalAuthApp();

    const response = await app.handle(
      new Request("http://localhost/public", {
        headers: { authorization: "Basic abc123" },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
  });

  it("sets user when a valid token is provided", async () => {
    const app = createOptionalAuthApp();

    const response = await app.handle(
      new Request("http://localhost/public", {
        headers: { authorization: "Bearer valid_token" },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(true);
    expect(body.userId).toBe("user-1");
  });

  it("sets user to null for an invalid token (no error thrown)", async () => {
    mockVerifyAccessToken.mockRejectedValueOnce(new Error("Bad token"));

    const app = createOptionalAuthApp();

    const response = await app.handle(
      new Request("http://localhost/public", {
        headers: { authorization: "Bearer bad_token" },
      })
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.authenticated).toBe(false);
    expect(body.userId).toBeNull();
  });
});
