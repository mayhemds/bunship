import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";

/**
 * Audit logs table
 * Comprehensive audit trail for all organization actions
 */
export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    actorId: text("actor_id"),
    actorType: text("actor_type", {
      enum: ["user", "api_key", "system"],
    }).notNull(),
    actorEmail: text("actor_email"),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    oldValues: text("old_values", { mode: "json" }).$type<Record<string, any>>(),
    newValues: text("new_values", { mode: "json" }).$type<Record<string, any>>(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    metadata: text("metadata", { mode: "json" }).$type<Record<string, any>>(),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    organizationIdIdx: index("audit_logs_organization_id_idx").on(table.organizationId),
    actorIdIdx: index("audit_logs_actor_id_idx").on(table.actorId),
    actorTypeIdx: index("audit_logs_actor_type_idx").on(table.actorType),
    actionIdx: index("audit_logs_action_idx").on(table.action),
    resourceTypeIdx: index("audit_logs_resource_type_idx").on(table.resourceType),
    resourceIdIdx: index("audit_logs_resource_id_idx").on(table.resourceId),
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    orgCreatedAtIdx: index("audit_logs_org_created_at_idx").on(
      table.organizationId,
      table.createdAt
    ),
  })
);

export type AuditLog = typeof auditLogs.$inferSelect;
export type NewAuditLog = typeof auditLogs.$inferInsert;
export type ActorType = AuditLog["actorType"];
