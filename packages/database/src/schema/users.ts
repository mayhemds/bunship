import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";

/**
 * User accounts table
 * Stores core user authentication and profile data
 */
export const users = sqliteTable(
  "users",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    email: text("email").notNull().unique(),
    emailVerified: integer("email_verified", { mode: "timestamp" }),
    passwordHash: text("password_hash"),
    fullName: text("full_name"),
    avatarUrl: text("avatar_url"),
    preferences: text("preferences", { mode: "json" })
      .$type<{
        theme?: "light" | "dark" | "system";
        language?: string;
        timezone?: string;
        notifications?: {
          email?: boolean;
          push?: boolean;
        };
      }>()
      .$defaultFn(() => ({})),
    twoFactorEnabled: integer("two_factor_enabled", { mode: "boolean" }).notNull().default(false),
    twoFactorSecret: text("two_factor_secret"),
    isAdmin: integer("is_admin", { mode: "boolean" }).notNull().default(false),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: integer("locked_until", { mode: "timestamp" }),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
    deletedAt: integer("deleted_at", { mode: "timestamp" }),
  },
  (table) => ({
    emailIdx: index("users_email_idx").on(table.email),
    isAdminIdx: index("users_is_admin_idx").on(table.isAdmin),
    isActiveIdx: index("users_is_active_idx").on(table.isActive),
    deletedAtIdx: index("users_deleted_at_idx").on(table.deletedAt),
  })
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
