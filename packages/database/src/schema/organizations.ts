import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { users } from "./users";

/**
 * Organizations table
 * Multi-tenant organizations for SaaS
 */
export const organizations = sqliteTable(
  "organizations",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    description: text("description"),
    logoUrl: text("logo_url"),
    settings: text("settings", { mode: "json" })
      .$type<{
        branding?: {
          primaryColor?: string;
          accentColor?: string;
        };
        features?: {
          webhooks?: boolean;
          apiAccess?: boolean;
          customDomain?: boolean;
        };
        billing?: {
          email?: string;
          taxId?: string;
        };
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
    slugIdx: index("organizations_slug_idx").on(table.slug),
    createdByIdx: index("organizations_created_by_idx").on(table.createdBy),
    deletedAtIdx: index("organizations_deleted_at_idx").on(table.deletedAt),
  })
);

export type Organization = typeof organizations.$inferSelect;
export type NewOrganization = typeof organizations.$inferInsert;
