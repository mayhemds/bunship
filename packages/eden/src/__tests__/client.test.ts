/**
 * Tests for the BunShip Eden client
 *
 * These tests demonstrate type safety and proper usage patterns.
 * They require a running BunShip API server.
 */

import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { createClient, type BunShipClient } from "../index";
import type { HealthResponse, AuthResponse, ErrorResponse, isErrorResponse } from "../types";

const TEST_API_URL = process.env.TEST_API_URL || "http://localhost:3000";

describe("BunShip Eden Client", () => {
  let client: BunShipClient;

  beforeAll(() => {
    client = createClient(TEST_API_URL);
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

      // Type assertion to verify structure
      const health: HealthResponse = response.data;
      expect(typeof health.status).toBe("string");
      expect(typeof health.timestamp).toBe("string");
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
        const status: string = response.data.status;
        const timestamp: string = response.data.timestamp;

        expect(status).toBeDefined();
        expect(timestamp).toBeDefined();
      }
    });

    test("should provide typed error responses", async () => {
      // This would fail with 401 if auth is required
      const response = await client.auth.me.get();

      if (response.error) {
        const error: ErrorResponse = response.error;
        expect(error.message).toBeDefined();
        expect(error.statusCode).toBeDefined();
        expect(typeof error.statusCode).toBe("number");
      }
    });
  });

  describe("Authentication flow", () => {
    const testUser = {
      email: "test@example.com",
      password: "Test123!@#",
      name: "Test User",
    };

    let accessToken: string;
    let refreshToken: string;

    test("should register a new user", async () => {
      const response = await client.auth.register.post({
        email: testUser.email,
        password: testUser.password,
        name: testUser.name,
      });

      if (response.error) {
        // User might already exist
        expect(response.status).toBeGreaterThanOrEqual(400);
      } else {
        expect(response.status).toBe(201);
        expect(response.data).toBeDefined();
        expect(response.data.user.email).toBe(testUser.email);
      }
    });

    test("should login with valid credentials", async () => {
      const response = await client.auth.login.post({
        email: testUser.email,
        password: testUser.password,
      });

      if (response.error) {
        console.error("Login error:", response.error);
      }

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      const auth: AuthResponse = response.data;
      expect(auth.accessToken).toBeDefined();
      expect(auth.refreshToken).toBeDefined();
      expect(auth.expiresIn).toBeGreaterThan(0);
      expect(auth.tokenType).toBe("Bearer");
      expect(auth.user.email).toBe(testUser.email);

      // Save tokens for other tests
      accessToken = auth.accessToken;
      refreshToken = auth.refreshToken;
    });

    test("should fail login with invalid credentials", async () => {
      const response = await client.auth.login.post({
        email: testUser.email,
        password: "wrong_password",
      });

      expect(response.error).toBeDefined();
      expect(response.status).toBe(401);
    });

    test("should get user profile with valid token", async () => {
      const authClient = createClient(TEST_API_URL, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const response = await authClient.auth.me.get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.email).toBe(testUser.email);
    });

    test("should fail to get profile without token", async () => {
      const response = await client.auth.me.get();

      expect(response.error).toBeDefined();
      expect(response.status).toBe(401);
    });

    test("should refresh access token", async () => {
      const response = await client.auth.refresh.post({
        refreshToken,
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.accessToken).toBeDefined();
      expect(response.data.accessToken).not.toBe(accessToken);
    });

    test("should logout successfully", async () => {
      const authClient = createClient(TEST_API_URL, {
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
      // Login to get authenticated client
      const loginResponse = await client.auth.login.post({
        email: "test@example.com",
        password: "Test123!@#",
      });

      if (loginResponse.data) {
        authClient = createClient(TEST_API_URL, {
          headers: { Authorization: `Bearer ${loginResponse.data.accessToken}` },
        });
      }
    });

    test("should create an organization", async () => {
      const response = await authClient.organizations.post({
        name: "Test Organization",
        slug: `test-org-${Date.now()}`,
      });

      expect(response.status).toBe(201);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe("Test Organization");

      orgId = response.data.id;
    });

    test("should list organizations", async () => {
      const response = await authClient.organizations.get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(Array.isArray(response.data)).toBe(true);
      expect(response.data.length).toBeGreaterThan(0);
    });

    test("should get specific organization", async () => {
      const response = await authClient.organizations({ id: orgId }).get();

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.id).toBe(orgId);
    });

    test("should update organization", async () => {
      const response = await authClient.organizations({ id: orgId }).patch({
        name: "Updated Test Organization",
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
      expect(response.data.name).toBe("Updated Test Organization");
    });

    test("should delete organization", async () => {
      const response = await authClient.organizations({ id: orgId }).delete();

      expect(response.status).toBe(200);
    });
  });

  describe("Error handling", () => {
    test("should handle validation errors", async () => {
      const response = await client.auth.login.post({
        email: "invalid-email",
        password: "short",
      });

      expect(response.error).toBeDefined();
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.error.message).toBeDefined();
    });

    test("should handle rate limiting", async () => {
      // Make multiple rapid requests to trigger rate limiting
      const promises = Array.from({ length: 100 }, () => client.health.get());

      const responses = await Promise.all(promises);

      // At least some should succeed
      const succeeded = responses.filter((r) => !r.error);
      expect(succeeded.length).toBeGreaterThan(0);

      // If rate limiting is implemented, some might fail
      const rateLimited = responses.filter((r) => r.status === 429);
      // This assertion depends on whether rate limiting is implemented
      // expect(rateLimited.length).toBeGreaterThanOrEqual(0);
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
      const customClient = createClient(TEST_API_URL, {
        headers: {
          "X-Custom-Header": "test-value",
          "X-Request-ID": "test-request-123",
        },
      });

      const response = await customClient.health.get();

      expect(response.status).toBe(200);
      // The API would need to echo headers back to verify this properly
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

  describe("Pagination", () => {
    let authClient: BunShipClient;

    beforeAll(async () => {
      const loginResponse = await client.auth.login.post({
        email: "test@example.com",
        password: "Test123!@#",
      });

      if (loginResponse.data) {
        authClient = createClient(TEST_API_URL, {
          headers: { Authorization: `Bearer ${loginResponse.data.accessToken}` },
        });
      }
    });

    test("should support pagination parameters", async () => {
      const response = await authClient.organizations.get({
        query: {
          page: 1,
          limit: 10,
          sort: "createdAt",
          order: "desc",
        },
      });

      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();

      if (response.data && "pagination" in response.data) {
        expect(response.data.pagination).toBeDefined();
        expect(response.data.pagination.page).toBe(1);
        expect(response.data.pagination.limit).toBe(10);
      }
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

    // @ts-ignore - Testing the type guard
    expect(isErrorResponse(errorResponse)).toBe(true);

    const successResponse = {
      success: true,
      data: { message: "Success" },
    };

    // @ts-ignore - Testing the type guard
    expect(isErrorResponse(successResponse)).toBe(false);
  });
});
