import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { resolve } from "path";
import * as schema from "./schema";

// Monorepo root: 3 levels up from packages/database/src/
const MONOREPO_ROOT = resolve(import.meta.dir, "../../..");

/**
 * Database configuration type
 */
export interface DatabaseConfig {
  url: string;
  authToken?: string;
}

/**
 * Creates a Drizzle database client with Turso/libSQL
 *
 * @param config - Database configuration with URL and optional auth token
 * @returns Drizzle database instance
 *
 * @example
 * ```typescript
 * // Local development
 * const db = createDatabase({
 *   url: "file:local.db"
 * });
 *
 * // Production with Turso
 * const db = createDatabase({
 *   url: process.env.TURSO_DATABASE_URL!,
 *   authToken: process.env.TURSO_AUTH_TOKEN
 * });
 * ```
 */
export function createDatabase(config: DatabaseConfig) {
  const client = createClient({
    url: config.url,
    authToken: config.authToken,
  });

  return drizzle(client, { schema });
}

/**
 * Database instance type
 */
export type Database = ReturnType<typeof createDatabase>;

/**
 * Default database instance
 * Configured from environment variables
 */
let db: Database | null = null;

/**
 * Gets or creates the default database instance
 * Uses TURSO_DATABASE_URL and TURSO_AUTH_TOKEN environment variables
 *
 * @returns Default database instance
 * @throws Error if TURSO_DATABASE_URL is not set
 */
export function getDatabase(): Database {
  if (!db) {
    const url = process.env.TURSO_DATABASE_URL;

    if (!url) {
      throw new Error(
        "TURSO_DATABASE_URL environment variable is required. " +
          "For local development, use 'file:local.db'"
      );
    }

    // Resolve relative file: paths to monorepo root so the same DB is used
    // regardless of which workspace CWD we're running from.
    // Skip in-memory URLs (file::memory:) and absolute paths (file:/).
    let resolvedUrl = url;
    if (url.startsWith("file:") && !url.startsWith("file:/") && !url.startsWith("file::memory:")) {
      const filePath = url.slice(5);
      resolvedUrl = `file:${resolve(MONOREPO_ROOT, filePath)}`;
    }

    db = createDatabase({
      url: resolvedUrl,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  return db;
}

/**
 * Resets the database instance
 * Useful for testing or when configuration changes
 */
export function resetDatabase(): void {
  db = null;
}
