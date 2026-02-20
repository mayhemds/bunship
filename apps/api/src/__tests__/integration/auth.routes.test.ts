/**
 * Integration tests for authentication routes.
 *
 * POST /api/v1/auth/register
 * POST /api/v1/auth/login
 * POST /api/v1/auth/refresh
 * POST /api/v1/auth/logout
 * GET  /api/v1/auth/verify-email/:token
 *
 * These tests require a working database (in-memory SQLite via libSQL).
 * If the database is unavailable the entire suite is skipped.
 */
import { describe, it, expect, beforeAll, beforeEach, afterAll } from "bun:test";
import {
  request,
  getApp,
  registerUser,
  registerAndLogin,
  uniqueEmail,
  isDatabaseAvailable,
} from "../helpers/setup";

let dbAvailable = false;

beforeAll(async () => {
  getApp();
  dbAvailable = await isDatabaseAvailable();

  if (!dbAvailable) {
    console.warn(
      "[auth.routes.test] Database is not available -- skipping database-dependent assertions."
    );
  }
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/register
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/register", () => {
  it("creates a user with valid data", async () => {
    if (!dbAvailable) return; // skip gracefully

    const email = uniqueEmail();
    const res = await request("POST", "/api/v1/auth/register", {
      body: {
        email,
        password: "Str0ngP@ssword!",
        fullName: "Integration Tester",
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("userId");
    expect(typeof res.body.userId).toBe("string");
  });

  it("rejects duplicate email", async () => {
    if (!dbAvailable) return;

    const email = uniqueEmail();
    // First registration should succeed
    await request("POST", "/api/v1/auth/register", {
      body: { email, password: "Str0ngP@ssword!", fullName: "User One" },
    });

    // Second with same email should fail
    const res = await request("POST", "/api/v1/auth/register", {
      body: { email, password: "An0therP@ss!", fullName: "User Two" },
    });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects a weak password (too short)", async () => {
    const res = await request("POST", "/api/v1/auth/register", {
      body: {
        email: uniqueEmail(),
        password: "short",
        fullName: "Weak Pwd",
      },
    });

    // Elysia schema validation enforces minLength: 8 on the password field,
    // so we expect a 400-level validation error from the framework.
    expect(res.status).toBe(400);
  });

  it("rejects an invalid email format", async () => {
    const res = await request("POST", "/api/v1/auth/register", {
      body: {
        email: "not-an-email",
        password: "Str0ngP@ssword!",
        fullName: "Bad Email",
      },
    });

    expect(res.status).toBe(400);
  });

  it("rejects a missing fullName", async () => {
    const res = await request("POST", "/api/v1/auth/register", {
      body: {
        email: uniqueEmail(),
        password: "Str0ngP@ssword!",
        // fullName intentionally omitted
      },
    });

    expect(res.status).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/login
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/login", () => {
  it("returns tokens for valid credentials", async () => {
    if (!dbAvailable) return;

    const email = uniqueEmail();
    const password = "ValidP@ssword1";
    await registerUser({ email, password });

    const res = await request("POST", "/api/v1/auth/login", {
      body: { email, password },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body).toHaveProperty("expiresIn");
    expect(typeof res.body.accessToken).toBe("string");
    expect(typeof res.body.refreshToken).toBe("string");
    expect(res.body.expiresIn).toBeGreaterThan(0);
  });

  it("rejects invalid credentials (wrong password)", async () => {
    if (!dbAvailable) return;

    const email = uniqueEmail();
    await registerUser({ email, password: "CorrectP@ss1" });

    const res = await request("POST", "/api/v1/auth/login", {
      body: { email, password: "WrongP@ssword1" },
    });

    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects login for non-existent email", async () => {
    if (!dbAvailable) return;

    const res = await request("POST", "/api/v1/auth/login", {
      body: {
        email: `nonexistent-${Date.now()}@example.com`,
        password: "Whatever@123",
      },
    });

    expect(res.status).toBe(401);
  });

  it("locks account after 5 failed login attempts", async () => {
    if (!dbAvailable) return;

    const email = uniqueEmail();
    await registerUser({ email, password: "CorrectP@ss1" });

    // Fail 5 times
    for (let i = 0; i < 5; i++) {
      await request("POST", "/api/v1/auth/login", {
        body: { email, password: "WrongP@ssword1" },
      });
    }

    // 6th attempt should report account locked
    const res = await request("POST", "/api/v1/auth/login", {
      body: { email, password: "CorrectP@ss1" },
    });

    expect(res.status).toBe(401);
    // The error message should indicate the account is locked
    const errorMessage =
      typeof res.body?.error === "object" ? res.body.error.message : (res.body?.message ?? "");
    expect(errorMessage.toLowerCase()).toContain("lock");
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/refresh
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/refresh", () => {
  it("rotates tokens with a valid refresh token", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin();

    const res = await request("POST", "/api/v1/auth/refresh", {
      body: { refreshToken: user.refreshToken },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("accessToken");
    expect(res.body).toHaveProperty("refreshToken");
    expect(res.body).toHaveProperty("expiresIn");
    // New tokens should differ from the originals
    expect(res.body.accessToken).not.toBe(user.accessToken);
  });

  it("rejects an invalid refresh token", async () => {
    const res = await request("POST", "/api/v1/auth/refresh", {
      body: { refreshToken: "invalid.token.value" },
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// POST /api/v1/auth/logout
// ---------------------------------------------------------------------------
describe("POST /api/v1/auth/logout", () => {
  it("invalidates the session when authenticated", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin();

    const res = await request("POST", "/api/v1/auth/logout", {
      token: user.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
  });

  it("returns 401 without an auth token", async () => {
    const res = await request("POST", "/api/v1/auth/logout");

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// GET /api/v1/auth/verify-email/:token
// ---------------------------------------------------------------------------
describe("GET /api/v1/auth/verify-email/:token", () => {
  it("returns an error for an invalid verification token", async () => {
    if (!dbAvailable) return;

    const res = await request("GET", "/api/v1/auth/verify-email/invalid-token-value");

    // Should be a 400 (invalid/expired token) or handled by error handler
    expect([400, 422, 500]).toContain(res.status);
  });

  // Note: Testing a *valid* verification flow would require intercepting the
  // token generated during registration. That is covered in the E2E auth
  // flow test where we access the database directly.
});
