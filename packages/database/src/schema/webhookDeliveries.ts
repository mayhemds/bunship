import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { webhooks } from "./webhooks";

/**
 * Webhook deliveries table
 * Logs all webhook delivery attempts and responses
 */
export const webhookDeliveries = sqliteTable(
  "webhook_deliveries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    webhookId: text("webhook_id")
      .notNull()
      .references(() => webhooks.id, { onDelete: "cascade" }),
    event: text("event").notNull(),
    payload: text("payload", { mode: "json" }).$type<Record<string, any>>().notNull(),
    response: text("response"),
    statusCode: integer("status_code"),
    attempts: integer("attempts").notNull().default(0),
    nextRetryAt: integer("next_retry_at", { mode: "timestamp" }),
    deliveredAt: integer("delivered_at", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    webhookIdIdx: index("webhook_deliveries_webhook_id_idx").on(table.webhookId),
    eventIdx: index("webhook_deliveries_event_idx").on(table.event),
    nextRetryAtIdx: index("webhook_deliveries_next_retry_at_idx").on(table.nextRetryAt),
    deliveredAtIdx: index("webhook_deliveries_delivered_at_idx").on(table.deliveredAt),
    createdAtIdx: index("webhook_deliveries_created_at_idx").on(table.createdAt),
    pendingRetryIdx: index("webhook_deliveries_pending_retry_idx").on(
      table.deliveredAt,
      table.nextRetryAt
    ),
  })
);

export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
export type NewWebhookDelivery = typeof webhookDeliveries.$inferInsert;
