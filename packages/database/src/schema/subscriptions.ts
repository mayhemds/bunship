import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { createId } from "@paralleldrive/cuid2";
import { organizations } from "./organizations";

/**
 * Subscriptions table
 * Stores Stripe subscription data for organizations
 */
export const subscriptions = sqliteTable(
  "subscriptions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => createId()),
    organizationId: text("organization_id")
      .notNull()
      .unique()
      .references(() => organizations.id, { onDelete: "cascade" }),
    stripeCustomerId: text("stripe_customer_id").notNull().unique(),
    stripeSubscriptionId: text("stripe_subscription_id").unique(),
    stripePriceId: text("stripe_price_id"),
    status: text("status", {
      enum: [
        "incomplete",
        "incomplete_expired",
        "trialing",
        "active",
        "past_due",
        "canceled",
        "unpaid",
        "paused",
      ],
    }).notNull(),
    planId: text("plan_id"),
    currentPeriodStart: integer("current_period_start", {
      mode: "timestamp",
    })
      .notNull()
      .$defaultFn(() => new Date()),
    currentPeriodEnd: integer("current_period_end", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    cancelAtPeriodEnd: integer("cancel_at_period_end", { mode: "boolean" })
      .notNull()
      .default(false),
    trialStart: integer("trial_start", { mode: "timestamp" }),
    trialEnd: integer("trial_end", { mode: "timestamp" }),
    createdAt: integer("created_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date()),
    updatedAt: integer("updated_at", { mode: "timestamp" })
      .notNull()
      .$defaultFn(() => new Date())
      .$onUpdateFn(() => new Date()),
  },
  (table) => ({
    organizationIdIdx: uniqueIndex("subscriptions_organization_id_idx").on(table.organizationId),
    stripeCustomerIdIdx: uniqueIndex("subscriptions_stripe_customer_id_idx").on(
      table.stripeCustomerId
    ),
    stripeSubscriptionIdIdx: index("subscriptions_stripe_subscription_id_idx").on(
      table.stripeSubscriptionId
    ),
    statusIdx: index("subscriptions_status_idx").on(table.status),
    currentPeriodEndIdx: index("subscriptions_current_period_end_idx").on(table.currentPeriodEnd),
  })
);

export type Subscription = typeof subscriptions.$inferSelect;
export type NewSubscription = typeof subscriptions.$inferInsert;
export type SubscriptionStatus = Subscription["status"];
