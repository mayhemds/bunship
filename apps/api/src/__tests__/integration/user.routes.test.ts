/**
 * Integration tests for user management routes.
 *
 * GET    /api/v1/users/me          - get current user profile
 * PATCH  /api/v1/users/me          - update profile
 * DELETE /api/v1/users/me          - soft-delete account
 *
 * All routes require authentication via Bearer token.
 * Tests that need the database are skipped gracefully when unavailable.
 */
import { describe, it, expect, beforeAll } from "bun:test";
import { request, getApp, registerAndLogin, isDatabaseAvailable } from "../helpers/setup";

let dbAvailable = false;

beforeAll(async () => {
  getApp();
  dbAvailable = await isDatabaseAvailable();

  if (!dbAvailable) {
    console.warn(
      "[user.routes.test] Database is not available -- skipping database-dependent assertions."
    );
  }
});

// ---------------------------------------------------------------------------
// GET /api/v1/users/me
// ---------------------------------------------------------------------------
describe("GET /api/v1/users/me", () => {
  it("returns the current user when authenticated", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin({ fullName: "Profile User" });

    const res = await request("GET", "/api/v1/users/me", {
      token: user.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("email");
    expect(res.body.email).toBe(user.email.toLowerCase());
    expect(res.body).toHaveProperty("createdAt");
    expect(res.body).toHaveProperty("updatedAt");
  });

  it("returns 401 without a token", async () => {
    const res = await request("GET", "/api/v1/users/me");

    expect(res.status).toBe(401);
  });

  it("returns 401 with an invalid token", async () => {
    if (!dbAvailable) return;

    const res = await request("GET", "/api/v1/users/me", {
      token: "not.a.valid.jwt",
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/v1/users/me
// ---------------------------------------------------------------------------
describe("PATCH /api/v1/users/me", () => {
  it("updates the user full name", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin({ fullName: "Original Name" });

    const res = await request("PATCH", "/api/v1/users/me", {
      token: user.accessToken,
      body: { fullName: "Updated Name" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("fullName", "Updated Name");
  });

  it("updates the user avatar URL", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin();

    const res = await request("PATCH", "/api/v1/users/me", {
      token: user.accessToken,
      body: { avatarUrl: "https://example.com/avatar.png" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("avatarUrl", "https://example.com/avatar.png");
  });

  it("merges preferences without overwriting existing keys", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin();

    // Set initial preferences
    await request("PATCH", "/api/v1/users/me", {
      token: user.accessToken,
      body: { preferences: { theme: "dark", language: "en" } },
    });

    // Merge new preference
    const res = await request("PATCH", "/api/v1/users/me", {
      token: user.accessToken,
      body: { preferences: { language: "fr" } },
    });

    expect(res.status).toBe(200);
    // "theme" should still be present; "language" should be updated
    expect(res.body.preferences).toHaveProperty("theme", "dark");
    expect(res.body.preferences).toHaveProperty("language", "fr");
  });

  it("returns 401 without authentication", async () => {
    const res = await request("PATCH", "/api/v1/users/me", {
      body: { fullName: "No Auth" },
    });

    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/v1/users/me
// ---------------------------------------------------------------------------
describe("DELETE /api/v1/users/me", () => {
  it("soft-deletes the user account", async () => {
    if (!dbAvailable) return;

    const user = await registerAndLogin({ fullName: "To Delete" });

    const res = await request("DELETE", "/api/v1/users/me", {
      token: user.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("deleted");
  });

  it("returns 401 without authentication", async () => {
    const res = await request("DELETE", "/api/v1/users/me");

    expect(res.status).toBe(401);
  });

  // Note: The route prevents deletion when the user owns organizations.
  // That scenario is exercised in the org-flow E2E test.
});
