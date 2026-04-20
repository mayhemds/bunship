/**
 * Integration tests for health check endpoints.
 *
 * GET /health      - basic liveness probe
 * GET /health/ready - readiness probe with dependency checks
 */
import { describe, it, expect, beforeAll } from "bun:test";
import { request, getApp } from "../helpers/setup";

beforeAll(() => {
  // Ensure the app is initialized
  getApp();
});

describe("GET /health", () => {
  it("returns 200 with status ok", async () => {
    const res = await request("GET", "/health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("status", "ok");
    expect(res.body).toHaveProperty("timestamp");
  });

  it("includes a valid ISO timestamp", async () => {
    const res = await request("GET", "/health");

    const parsed = new Date(res.body.timestamp);
    expect(parsed.toISOString()).toBe(res.body.timestamp);
  });
});

describe("GET /health/ready", () => {
  it("returns health check details with checks object", async () => {
    const res = await request("GET", "/health/ready");

    // Status may be 200 (all healthy) or 503 (degraded) depending on
    // whether the test environment has a live database and Redis.
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("status");
    expect(["ready", "degraded"]).toContain(res.body.status);
    expect(res.body).toHaveProperty("timestamp");
    expect(res.body).toHaveProperty("checks");
    expect(res.body.checks).toHaveProperty("api");
    expect(res.body.checks).toHaveProperty("database");
    expect(res.body.checks).toHaveProperty("redis");
  });

  it("always reports the API check as true", async () => {
    const res = await request("GET", "/health/ready");

    expect(res.body.checks.api).toBe(true);
  });
});
