import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Projects table
 * Example resource to demonstrate multi-tenant patterns
 */
export const projects = sqliteTable(
  "projects",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    description: text("description"),
    settings: text("settings", { mode: "json" })
      .$type<{
        visibility?: "public" | "private" | "internal";
        features?: Record<string, boolean>;
        integrations?: Record<string, any>;
      }>()
      .$defaultFn(() => ({})),
    createdBy: text("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
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
    orgSlugIdx: uniqueIndex("projects_org_slug_idx").on(table.organizationId, table.slug),
    organizationIdIdx: index("projects_organization_id_idx").on(table.organizationId),
    createdByIdx: index("projects_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("projects_deleted_at_idx").on(table.deletedAt),
  })
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
