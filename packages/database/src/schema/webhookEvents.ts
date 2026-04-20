import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

/**
 * Processed webhook events — idempotency ledger for inbound webhooks
 * (Stripe, etc.). Primary key is the provider's event id so a second
 * delivery of the same event fails on insert and is treated as a no-op.
 */
export const webhookEvents = sqliteTable(
  "webhook_events",
  {
    eventId: text("event_id").primaryKey(),
    provider: text("provider").notNull(),
    eventType: text("event_type").notNull(),
    receivedAt: integer("received_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
  },
  (table) => ({
    providerIdx: index("webhook_events_provider_idx").on(table.provider),
    receivedAtIdx: index("webhook_events_received_at_idx").on(table.receivedAt),
  })
);

export type WebhookEvent = typeof webhookEvents.$inferSelect;
export type NewWebhookEvent = typeof webhookEvents.$inferInsert;
