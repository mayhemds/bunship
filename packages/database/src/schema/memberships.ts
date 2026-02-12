import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";
import { organizations } from "./organizations";

/**
 * Organization memberships table
 * Links users to organizations with roles
 */
export const memberships = sqliteTable(
  "memberships",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    role: text("role", {
      enum: ["owner", "admin", "member", "viewer"],
    }).notNull(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    userOrgIdx: uniqueIndex("memberships_user_org_idx").on(table.userId, table.organizationId),
    userIdIdx: index("memberships_user_id_idx").on(table.userId),
    organizationIdIdx: index("memberships_organization_id_idx").on(table.organizationId),
    roleIdx: index("memberships_role_idx").on(table.role),
    userRoleIdx: index("memberships_user_role_idx").on(table.userId, table.role),
  })
);

export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;
export type MembershipRole = Membership["role"];
