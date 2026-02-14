import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

/**
 * Verification tokens table
 * Stores tokens for email verification and password reset
 */
export const verificationTokens = sqliteTable(
  "verification_tokens",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    type: text("type", {
      enum: ["email_verification", "password_reset"],
    }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    usedAt: integer("used_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    userIdIdx: index("verification_tokens_user_id_idx").on(table.userId),
    tokenHashIdx: index("verification_tokens_token_hash_idx").on(table.tokenHash),
    typeIdx: index("verification_tokens_type_idx").on(table.type),
    expiresAtIdx: index("verification_tokens_expires_at_idx").on(table.expiresAt),
  })
);

export type VerificationToken = typeof verificationTokens.$inferSelect;
export type NewVerificationToken = typeof verificationTokens.$inferInsert;
export type TokenType = VerificationToken["type"];
