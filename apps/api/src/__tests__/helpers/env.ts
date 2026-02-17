/**
 * Test environment preload — runs before any test file via bunfig.toml.
 *
 * Sets required env vars so module-level guards (jwt.ts, email.ts,
 * billing.service.ts) don't throw when imported.
 *
 * IMPORTANT: Bun auto-loads .env from CWD before preloads run. Since tests
 * run from apps/api/ (which has a .env pointing to local.db), we must
 * force-set TURSO_DATABASE_URL to use in-memory SQLite.
 */

process.env.JWT_SECRET ??= "test-jwt-secret-that-is-at-least-32-chars-long!!";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-that-is-at-least-32-chars!!";
// Force in-memory DB for tests — overrides .env file
process.env.TURSO_DATABASE_URL = "file::memory:";
process.env.STRIPE_SECRET_KEY ??= "sk_test_fake_key_for_testing";
process.env.RESEND_API_KEY ??= "re_test_fake_key_for_testing";
process.env.NODE_ENV = "test";
// Disable rate limiting in tests to prevent E2E cascade failures
process.env.RATE_LIMIT_AUTH = "10000";
