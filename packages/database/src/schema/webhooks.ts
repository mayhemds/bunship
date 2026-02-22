import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";

/**
 * Webhooks table
 * Manages webhook endpoint configurations for organizations
 */
export const webhooks = sqliteTable(
  "webhooks",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    description: text("description"),
    // Stored encrypted at application level - needed in plaintext form to sign outbound webhook payloads
    secret: text("secret").notNull(),
    events: text("events", { mode: "json" })
      .$type<string[]>()
      .notNull()
      .$defaultFn(() => []),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    organizationIdIdx: index("webhooks_organization_id_idx").on(table.organizationId),
    isActiveIdx: index("webhooks_is_active_idx").on(table.isActive),
  })
);

export type Webhook = typeof webhooks.$inferSelect;
export type NewWebhook = typeof webhooks.$inferInsert;
