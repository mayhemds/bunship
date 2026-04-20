import type { Config } from "drizzle-kit";
import { resolve } from "path";

// drizzle-kit transpiles this to CJS, so import.meta.dir is unavailable.
// --filter sets CWD to packages/database/, so root is 2 levels up.
const MONOREPO_ROOT = resolve(process.cwd(), "../..");

function resolveDbUrl(url: string): string {
  if (url.startsWith("file:") && !url.startsWith("file:/")) {
    return `file:${resolve(MONOREPO_ROOT, url.slice(5))}`;
  }
  return url;
}

/**
 * Drizzle Kit configuration for migrations and introspection
 *
 * Environment variables:
 * - TURSO_DATABASE_URL: Database connection URL (required)
 * - TURSO_AUTH_TOKEN: Turso authentication token (optional for local)
 *
 * @see https://orm.drizzle.team/kit-docs/config-reference
 */
export default {
  schema: "./src/schema/index.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: resolveDbUrl(process.env.TURSO_DATABASE_URL || "file:local.db"),
  },
  verbose: true,
  strict: true,
} satisfies Config;
