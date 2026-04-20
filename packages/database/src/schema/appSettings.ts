import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";

/**
 * App-wide key/value settings (maintenance mode, feature flags, etc.).
 * A single shared row per key; no tenancy.
 */
export const appSettings = sqliteTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).$type<unknown>().notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

export type AppSetting = typeof appSettings.$inferSelect;
export type NewAppSetting = typeof appSettings.$inferInsert;
