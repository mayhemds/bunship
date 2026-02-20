/**
 * @package @bunship/database
 * @description Drizzle ORM database package for BunShip SaaS boilerplate
 *
 * This package provides:
 * - Database schema definitions for multi-tenant SaaS
 * - Drizzle ORM client with Turso/libSQL support
 * - TypeScript types for all tables and relations
 * - Pre-configured indexes and constraints
 */

// Export database client and utilities
export {
  createDatabase,
  getDatabase,
  resetDatabase,
  type Database,
  type DatabaseConfig,
} from "./client";

// Export all schemas and relations
export * from "./schema";

// Export utility functions
export * from "./utils";

// Re-export Drizzle utilities for convenience
export {
  eq,
  ne,
  and,
  or,
  not,
  gt,
  gte,
  lt,
  lte,
  like,
  desc,
  asc,
  isNull,
  isNotNull,
  sql,
} from "drizzle-orm";
export type { InferSelectModel, InferInsertModel } from "drizzle-orm";
