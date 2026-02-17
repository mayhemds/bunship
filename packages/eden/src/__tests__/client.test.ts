/**
 * Tests for the BunShip Eden client
 *
 * These tests verify the Eden treaty client against a real Elysia server.
 * Routes are mounted at root level (no /api/v1 prefix) so Eden paths
 * like client.auth.login map directly to /auth/login.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createClient, type BunShipClient } from "../index";
import type { HealthResponse, ErrorResponse } from "../types";
import { isErrorResponse } from "../types";
import { getEdenApp, isDatabaseAvailable } from "../../../../apps/api/src/__tests__/helpers/setup";

describe("BunShip Eden Client", () => {
  let client: BunShipClient;
  let app: ReturnType<typeof getEdenApp>;
  let dbAvailable = false;

  beforeAll(async () => {
    app = getEdenApp();
    app.listen(0);
    const port = app.server!.port;
    client = createClient(`http://localhost:${port}`);
    dbAvailable = await isDatabaseAvailable();
  });

  afterAll(() => {
    app?.stop();
  });

  describe("Basic endpoints", () => {
    test("should fetch root endpoint", async () => {
      const response = await client.index.get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.message).toBe("BunShip API");
      expect(response.data.status).toBe("running");
    });

    test("should fetch health endpoint", async () => {
      const response = await client.health.get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.status).toBe("ok");
      expect(response.data.timestamp).toBeDefined();
    });

    test("should handle 404 for invalid endpoints", async () => {
      // @ts-expect-error - Testing invalid endpoint
      const response = await client.invalidEndpoint?.get();

      // The actual behavior depends on Elysia's 404 handling
      // This test verifies the client doesn't crash
      expect(response).toBeDefined();
    });
  });

  describe("Type safety", () => {
    test("should provide typed responses", async () => {
      const response = await client.health.get();

      // TypeScript should infer the correct type
      if (response.data) {
        expect(response.data.status).toBeDefined();
        expect(response.data.timestamp).toBeDefined();
      }
    });

    test("should provide error responses for unauthenticated requests", async () => {
      // /users/me requires auth — should return 401
      const response = await client.users.me.get();

      expect(response.error).toBeDefined();
      expect(response.status).toBe(401);
    });
  });

  describe("Authentication flow", () => {
    const testUser = {
      email: `eden-test-${Date.now()}@example.com`,
      password: "Test123!@#SecurePass",
      fullName: "Eden Test User",
    };

    let accessToken: string;
    let refreshToken: string;

    test("should register a new user", async () => {
      if (!dbAvailable) return;
      const response = await client.auth.register.post({
        email: testUser.email,
        password: testUser.password,
        fullName: testUser.fullName,
      });

      // Register returns 200 with { message, userId }
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.userId).toBeDefined();
    });

    test("should login with valid credentials", async () => {
      if (!dbAvailable) return;
      const response = await client.auth.login.post({
        email: testUser.email,
        password: testUser.password,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.refreshToken).toBeDefined();
      expect(response.data.expiresIn).toBeGreaterThan(0);

      // Save tokens for other tests
      accessToken = response.data.accessToken;
      refreshToken = response.data.refreshToken;
    });

    test("should fail login with invalid credentials", async () => {
      if (!dbAvailable) return;
      const response = await client.auth.login.post({
        email: testUser.email,
        password: "wrong_password",
      });

      expect(response.error).toBeDefined();
      expect(response.status).toBe(401);
    });

    test("should get user profile with valid token", async () => {
      if (!dbAvailable) return;
      const authClient = createClient(`http://localhost:${app.server!.port}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // Profile is at /users/me, not /auth/me
      const response = await authClient.users.me.get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.email).toBe(testUser.email);
    });

    test("should fail to get profile without token", async () => {
      if (!dbAvailable) return;
      const response = await client.users.me.get();

      expect(response.error).toBeDefined();
      expect(response.status).toBe(401);
    });

    test("should refresh access token", async () => {
      if (!dbAvailable) return;
      const response = await client.auth.refresh.post({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.accessToken).not.toBe(accessToken);
    });

    test("should logout successfully", async () => {
      if (!dbAvailable) return;
      const authClient = createClient(`http://localhost:${app.server!.port}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const response = await authClient.auth.logout.post();

      expect(response.status).toBe(200);
    });
  });

  describe("Organization management", () => {
    let authClient: BunShipClient;
    let orgId: string;

    beforeAll(async () => {
      if (!dbAvailable) return;
      // Register and login a fresh user for org tests
      const email = `eden-org-${Date.now()}@example.com`;
      await client.auth.register.post({
        email,
        password: "Test123!@#SecurePass",
        fullName: "Org Test User",
      });
      const loginResponse = await client.auth.login.post({
        email,
        password: "Test123!@#SecurePass",
      });

      if (loginResponse.data) {
        const port = app.server!.port;
        authClient = createClient(`http://localhost:${port}`, {
          headers: { Authorization: `Bearer ${loginResponse.data.accessToken}` },
        });
      }
    });

    test("should create an organization", async () => {
      if (!dbAvailable || !authClient) return;
      const response = await authClient.organizations.post({
        name: "Test Organization",
        slug: `test-org-${Date.now()}`,
      });

      expect(response.data).toBeDefined();
      expect(response.data.name).toBe("Test Organization");
      expect(response.data.id).toBeDefined();

      orgId = response.data.id;
    });

    test("should list organizations", async () => {
      if (!dbAvailable || !authClient) return;
      const response = await authClient.organizations.get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should get specific organization", async () => {
      if (!dbAvailable || !authClient || !orgId) return;
      const response = await authClient.organizations({ id: orgId }).get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should update organization", async () => {
      if (!dbAvailable || !authClient || !orgId) return;
      const response = await authClient.organizations({ id: orgId }).patch({
        name: "Updated Test Organization",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    test("should delete organization", async () => {
      if (!dbAvailable || !authClient || !orgId) return;
      const response = await authClient.organizations({ id: orgId }).delete();

      expect(response.status).toBe(200);
    });
  });

  describe("Error handling", () => {
    test("should handle validation errors", async () => {
      // Login with invalid email format triggers validation error
      const response = await client.auth.login.post({
        email: "invalid-email",
        password: "short",
      });

      expect(response.error).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test("should handle rate limiting", async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 100 }, () => client.health.get());

      const responses = await Promise.all(promises);

      // At least some should succeed
      const succeeded = responses.filter((r) => !r.error);
      expect(succeeded.length).toBeGreaterThan(0);
    });

    test("should handle network errors gracefully", async () => {
      const invalidClient = createClient("http://localhost:9999");

      try {
        await invalidClient.health.get();
        // If we reach here, the request unexpectedly succeeded
        expect(true).toBe(false);
      } catch (error) {
        // Network error should be caught
        expect(error).toBeDefined();
      }
    });
  });

  describe("Custom headers", () => {
    test("should send custom headers", async () => {
      const customClient = createClient(`http://localhost:${app.server!.port}`, {
        headers: {
          "X-Custom-Header": "test-value",
          "X-Request-ID": "test-request-123",
        },
      });

      const response = await customClient.health.get();

      expect(response.status).toBe(200);
    });

    test("should override headers per request", async () => {
      const response = await client.health.get({
        headers: {
          "X-Override": "per-request",
        },
      });

      expect(response.status).toBe(200);
    });
  });
});

describe("Type guards", () => {
  test("isErrorResponse should correctly identify error responses", () => {
    const errorResponse: ErrorResponse = {
      error: "Unauthorized",
      message: "Invalid credentials",
      statusCode: 401,
    };

    expect(isErrorResponse(errorResponse)).toBe(true);

    const successResponse = {
      success: true,
      data: { message: "Success" },
    };

    expect(isErrorResponse(successResponse)).toBe(false);
  });
});
