import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";
import { relations } from "drizzle-orm";

/**
 * Backup codes table
 * Stores hashed backup codes for two-factor authentication recovery
 */
export const backupCodes = sqliteTable(
  "backup_codes",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: text("code_hash").notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("backup_codes_user_id_idx").on(table.userId),
  })
);

export const backupCodesRelations = relations(backupCodes, ({ one }) => ({
  user: one(users, {
    fields: [backupCodes.userId],
    references: [users.id],
  }),
}));

export type BackupCode = typeof backupCodes.$inferSelect;
export type NewBackupCode = typeof backupCodes.$inferInsert;
