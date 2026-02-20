import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * API keys table
 * Manages API authentication keys for organizations
 */
export const apiKeys = sqliteTable(
  "api_keys",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    keyPrefix: text("key_prefix").notNull(),
    keyHash: text("key_hash").notNull().unique(),
    scopes: text("scopes", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    rateLimit: integer("rate_limit"),
    lastUsedAt: integer("last_used_at", { mode: "timestamp" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    organizationIdIdx: index("api_keys_organization_id_idx").on(table.organizationId),
    keyHashIdx: index("api_keys_key_hash_idx").on(table.keyHash),
    keyPrefixIdx: index("api_keys_key_prefix_idx").on(table.keyPrefix),
    isActiveIdx: index("api_keys_is_active_idx").on(table.isActive),
    expiresAtIdx: index("api_keys_expires_at_idx").on(table.expiresAt),
  })
);

export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
