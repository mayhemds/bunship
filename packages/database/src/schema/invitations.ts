import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Team invitations table
 * Manages pending invitations to join organizations
 */
export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    role: text("role", {
      enum: ["owner", "admin", "member", "viewer"],
    }).notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    invitedBy: text("invited_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    acceptedAt: integer("accepted_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    tokenHashIdx: uniqueIndex("invitations_token_hash_idx").on(table.tokenHash),
    organizationIdIdx: index("invitations_organization_id_idx").on(table.organizationId),
    emailIdx: index("invitations_email_idx").on(table.email),
    expiresAtIdx: index("invitations_expires_at_idx").on(table.expiresAt),
    acceptedAtIdx: index("invitations_accepted_at_idx").on(table.acceptedAt),
  })
);

export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
