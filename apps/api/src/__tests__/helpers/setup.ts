/**
 * Test setup helpers for BunShip API integration tests.
 *
 * Builds an Elysia app instance without calling .listen() so requests
 * can be dispatched through app.handle() with no real server needed.
 *
 * Because the production index.ts calls .listen() at module scope, we
 * reconstruct the app here from the same route plugins.
 */
import { Elysia } from "elysia";

// ---------------------------------------------------------------------------
// Environment bootstrap - must run before any module that reads env vars
// ---------------------------------------------------------------------------

// JWT secrets required by lib/jwt.ts (validated on import)
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = "test-jwt-secret-that-is-at-least-32-chars-long!!";
}
if (!process.env.JWT_REFRESH_SECRET) {
  process.env.JWT_REFRESH_SECRET = "test-refresh-secret-that-is-at-least-32-chars!!";
}

// Database URL - use in-memory SQLite for tests
if (!process.env.TURSO_DATABASE_URL) {
  process.env.TURSO_DATABASE_URL = "file::memory:";
}

// Stripe secret required by billing.service.ts (validated on import)
if (!process.env.STRIPE_SECRET_KEY) {
  process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_testing";
}

// Resend API key required by lib/email.ts (validated on import)
if (!process.env.RESEND_API_KEY) {
  process.env.RESEND_API_KEY = "re_test_fake_key_for_testing";
}

// Suppress noisy logs during tests
process.env.NODE_ENV = "test";

// ---------------------------------------------------------------------------
// App construction
// ---------------------------------------------------------------------------
import { cors } from "@elysiajs/cors";
import { errorHandler } from "../../plugins/errorHandler";
import { healthRoutes } from "../../routes/health";
import { authRoutes } from "../../routes/auth";
import { userRoutes } from "../../routes/users";
import { organizationRoutes } from "../../routes/organizations";

let _app: any = null;

/**
 * Returns a shared Elysia app instance suitable for testing.
 * The app is NOT listening on a port - use app.handle(Request) instead.
 */
export function getApp(): any {
  if (_app) return _app;

  _app = new Elysia()
    .use(cors())
    .use(errorHandler)
    // Health routes (outside API prefix, same as production)
    .use(healthRoutes)
    // API v1 routes
    .group("/api/v1", (app) => app.use(authRoutes).use(userRoutes).use(organizationRoutes));

  return _app;
}

/**
 * Returns an Elysia app with routes at root level (no /api/v1 prefix).
 * Used by Eden treaty tests where client.auth.login maps to /auth/login.
 */
export function getEdenApp(): any {
  return new Elysia()
    .use(cors())
    .use(errorHandler)
    .get("/", () => ({
      message: "BunShip API",
      status: "running",
    }))
    .use(healthRoutes)
    .use(authRoutes)
    .use(userRoutes)
    .use(organizationRoutes);
}

// ---------------------------------------------------------------------------
// HTTP request helper
// ---------------------------------------------------------------------------

export interface TestResponse<T = any> {
  status: number;
  body: T;
  headers: Headers;
}

/**
 * Make an HTTP request against the test app instance without a running server.
 */
export async function request<T = any>(
  method: string,
  path: string,
  options?: {
    body?: any;
    headers?: Record<string, string>;
    token?: string;
  }
): Promise<TestResponse<T>> {
  const app = getApp();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...options?.headers,
  };

  if (options?.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const response = await app.handle(
    new Request(`http://localhost${path}`, {
      method,
      headers,
      body: options?.body ? JSON.stringify(options.body) : undefined,
    })
  );

  const contentType = response.headers.get("content-type") ?? "";
  const body = contentType.includes("json") ? await response.json() : await response.text();

  return {
    status: response.status,
    body: body as T,
    headers: response.headers,
  };
}

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

interface RegisteredUser {
  userId: string;
  email: string;
  password: string;
  fullName: string;
}

interface AuthenticatedUser extends RegisteredUser {
  accessToken: string;
  refreshToken: string;
}

let userCounter = 0;

/**
 * Generate a unique test email to avoid collisions between tests.
 */
export function uniqueEmail(): string {
  userCounter += 1;
  return `testuser-${userCounter}-${Date.now()}@example.com`;
}

/**
 * Register a new user through the API and return the created user info.
 */
export async function registerUser(overrides?: {
  email?: string;
  password?: string;
  fullName?: string;
}): Promise<RegisteredUser> {
  const email = overrides?.email ?? uniqueEmail();
  const password = overrides?.password ?? "Str0ngP@ssword!";
  const fullName = overrides?.fullName ?? "Test User";

  const res = await request("POST", "/api/v1/auth/register", {
    body: { email, password, fullName },
  });

  if (res.status !== 200) {
    throw new Error(`registerUser failed (${res.status}): ${JSON.stringify(res.body)}`);
  }

  return { userId: res.body.userId, email, password, fullName };
}

/**
 * Register and login a user, returning the access + refresh tokens.
 */
export async function registerAndLogin(overrides?: {
  email?: string;
  password?: string;
  fullName?: string;
}): Promise<AuthenticatedUser> {
  const user = await registerUser(overrides);

  const res = await request("POST", "/api/v1/auth/login", {
    body: { email: user.email, password: user.password },
  });

  if (res.status !== 200) {
    throw new Error(
      `registerAndLogin login step failed (${res.status}): ${JSON.stringify(res.body)}`
    );
  }

  return {
    ...user,
    accessToken: res.body.accessToken,
    refreshToken: res.body.refreshToken,
  };
}

// ---------------------------------------------------------------------------
// Database helpers
// ---------------------------------------------------------------------------

let _dbReady = false;

/**
 * Check whether the database is reachable AND has tables. On first call,
 * runs the Drizzle migration SQL to create the schema in the in-memory DB.
 *
 * IMPORTANT: We do NOT call resetDatabase() here. Services like auth.service.ts
 * cache `const db = getDatabase()` at module level. Resetting would create a new
 * DB instance while services still hold the old one.
 */
export async function isDatabaseAvailable(): Promise<boolean> {
  if (_dbReady) return true;

  try {
    const { getDatabase } = await import("@bunship/database");
    const { sql } = await import("drizzle-orm");
    const db = getDatabase();

    // Guard: if db.run is undefined, mock pollution from service tests
    // has replaced @bunship/database. The real DB is inaccessible.
    if (typeof db.run !== "function") {
      return false;
    }

    // Check if tables already exist (from a previous test file in this process)
    try {
      await db.run(sql`SELECT 1 FROM users LIMIT 0`);
      _dbReady = true;
      return true;
    } catch {
      // Tables don't exist yet — run migrations below
    }

    // Read and execute migration SQL to create all tables
    const { resolve } = await import("path");
    const migrationPath = resolve(
      import.meta.dir,
      "../../../../../packages/database/drizzle/0000_great_wong.sql"
    );
    const migrationSql = await Bun.file(migrationPath).text();

    const statements = migrationSql
      .split("--> statement-breakpoint")
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 0);

    for (const stmt of statements) {
      await db.run(sql.raw(stmt));
    }

    _dbReady = true;
    return true;
  } catch (e) {
    console.error("[isDatabaseAvailable] Failed to set up test database:", e);
    return false;
  }
}
