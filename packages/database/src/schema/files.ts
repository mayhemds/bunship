import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";
import { users } from "./users";

/**
 * Files table
 * Manages uploaded files in S3-compatible storage
 */
export const files = sqliteTable(
  "files",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    uploadedBy: text("uploaded_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    key: text("key").notNull(), // S3 object key
    bucket: text("bucket").notNull(),
    size: integer("size").notNull(), // File size in bytes
    mimeType: text("mime_type").notNull(),
    metadata: text("metadata", { mode: "json" })
      .$type<{
        width?: number;
        height?: number;
        duration?: number;
        originalName?: string;
        description?: string;
        tags?: string[];
        [key: string]: unknown;
      }>()
      .$defaultFn(() => ({})),
    isPublic: integer("is_public", { mode: "boolean" }).notNull().default(false),
    expiresAt: integer("expires_at", { mode: "timestamp" }), // For temporary files
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
    organizationIdIdx: index("files_organization_id_idx").on(table.organizationId),
    uploadedByIdx: index("files_uploaded_by_idx").on(table.uploadedBy),
    bucketKeyIdx: uniqueIndex("files_bucket_key_idx").on(table.bucket, table.key),
    expiresAtIdx: index("files_expires_at_idx").on(table.expiresAt),
    deletedAtIdx: index("files_deleted_at_idx").on(table.deletedAt),
    createdAtIdx: index("files_created_at_idx").on(table.createdAt),
  })
);

export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
