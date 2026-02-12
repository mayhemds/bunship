/**
 * Billing Service
 * Handles Stripe subscription management
 */
import Stripe from "stripe";
import { appConfig, billingConfig } from "@bunship/config";
import {
  getDatabase,
  subscriptions,
  organizations,
  memberships,
  projects,
  webhooks,
  apiKeys,
  auditLogs,
  eq,
  and,
  sql,
} from "@bunship/database";
import { NotFoundError, ValidationError } from "@bunship/utils";

let stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set. Set it in your .env file to enable billing.");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2024-12-18.acacia",
      typescript: true,
    });
  }
  return stripe;
}

/**
 * Get or create Stripe customer for organization
 */
export async function getOrCreateStripeCustomer(orgId: string): Promise<string> {
  const db = getDatabase();

  // Check if subscription with customer exists
  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
  });

  if (subscription?.stripeCustomerId) {
    return subscription.stripeCustomerId;
  }

  // Get organization details
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
  });

  if (!org) {
    throw new NotFoundError("Organization");
  }

  // Create Stripe customer
  const customer = await getStripe().customers.create({
    name: org.name,
    metadata: {
      organizationId: orgId,
    },
  });

  // Create or update subscription record
  if (subscription) {
    await db
      .update(subscriptions)
      .set({
        stripeCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, subscription.id));
  } else {
    await db.insert(subscriptions).values({
      organizationId: orgId,
      stripeCustomerId: customer.id,
      status: "incomplete",
    });
  }

  return customer.id;
}

/**
 * Get subscription status for organization
 */
export async function getSubscription(orgId: string) {
  const db = getDatabase();

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
  });

  if (!subscription) {
    // Return free plan if no subscription
    const freePlan = billingConfig.plans.find((p) => p.id === "free");
    return {
      plan: freePlan,
      status: "active",
      subscription: null,
    };
  }

  // Determine current plan
  const plan =
    billingConfig.plans.find((p) => p.id === subscription.planId) ||
    billingConfig.plans.find((p) => p.id === "free");

  return {
    plan,
    status: subscription.status,
    subscription: {
      id: subscription.id,
      stripeSubscriptionId: subscription.stripeSubscriptionId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEnd: subscription.trialEnd,
    },
  };
}

/**
 * Create Stripe Customer Portal session
 */
export async function createPortalSession(orgId: string, returnUrl?: string) {
  const customerId = await getOrCreateStripeCustomer(orgId);

  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl || `${appConfig.url}/dashboard/billing`,
  });

  return session;
}

/**
 * Create Stripe Checkout session
 */
export async function createCheckoutSession(
  orgId: string,
  priceId: string,
  successUrl?: string,
  cancelUrl?: string
) {
  // Validate price ID belongs to a plan
  const plan = billingConfig.plans.find(
    (p) => p.stripePriceIds.monthly === priceId || p.stripePriceIds.yearly === priceId
  );

  if (!plan) {
    throw new ValidationError("Invalid price ID");
  }

  const customerId = await getOrCreateStripeCustomer(orgId);

  const session = await getStripe().checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: successUrl || `${appConfig.url}/dashboard/billing?success=true`,
    cancel_url: cancelUrl || `${appConfig.url}/dashboard/billing?canceled=true`,
    metadata: {
      organizationId: orgId,
      planId: plan.id,
    },
    subscription_data: {
      metadata: {
        organizationId: orgId,
        planId: plan.id,
      },
    },
  });

  return session;
}

/**
 * Cancel subscription at period end
 */
export async function cancelSubscription(orgId: string) {
  const db = getDatabase();

  const subscription = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, orgId),
  });

  if (!subscription?.stripeSubscriptionId) {
    throw new NotFoundError("Subscription");
  }

  // Cancel at period end in Stripe
  const updatedSubscription = await getStripe().subscriptions.update(
    subscription.stripeSubscriptionId,
    {
      cancel_at_period_end: true,
    }
  );

  // Update local database
  await db
    .update(subscriptions)
    .set({
      cancelAtPeriodEnd: true,
      updatedAt: new Date(),
    })
    .where(eq(subscriptions.id, subscription.id));

  return {
    success: true,
    cancelAt: new Date(updatedSubscription.cancel_at! * 1000),
  };
}

/**
 * Get invoices for organization
 */
export async function getInvoices(orgId: string, limit = 10) {
  const safeLimit = Math.min(Math.max(1, limit), 100);
  const customerId = await getOrCreateStripeCustomer(orgId);

  const invoices = await getStripe().invoices.list({
    customer: customerId,
    limit: safeLimit,
  });

  return invoices.data.map((invoice) => ({
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    amount: invoice.amount_due,
    currency: invoice.currency,
    created: new Date(invoice.created * 1000),
    dueDate: invoice.due_date ? new Date(invoice.due_date * 1000) : null,
    paidAt: invoice.status_transitions.paid_at
      ? new Date(invoice.status_transitions.paid_at * 1000)
      : null,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
  }));
}

/**
 * Get usage statistics for organization
 */
export async function getUsage(orgId: string) {
  const db = getDatabase();

  // Get current subscription
  const subscriptionData = await getSubscription(orgId);
  const plan = subscriptionData.plan!;

  // Get actual usage from database (parallelized with proper column references)
  const [
    [{ apiRequestCount }],
    [{ memberCount }],
    [{ projectCount }],
    [{ webhookCount }],
    [{ apiKeyCount }],
  ] = await Promise.all([
    db
      .select({ apiRequestCount: sql<number>`count(*)` })
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, orgId)),
    db
      .select({ memberCount: sql<number>`count(*)` })
      .from(memberships)
      .where(eq(memberships.organizationId, orgId)),
    db
      .select({ projectCount: sql<number>`count(*)` })
      .from(projects)
      .where(eq(projects.organizationId, orgId)),
    db
      .select({ webhookCount: sql<number>`count(*)` })
      .from(webhooks)
      .where(eq(webhooks.organizationId, orgId)),
    db
      .select({ apiKeyCount: sql<number>`count(*)` })
      .from(apiKeys)
      .where(and(eq(apiKeys.organizationId, orgId), eq(apiKeys.isActive, true))),
  ]);

  return {
    plan: {
      id: plan.id,
      name: plan.name,
      limits: plan.limits,
    },
    usage: {
      members: {
        current: memberCount,
        limit: plan.limits.members,
        percentage: plan.limits.members === -1 ? 0 : (memberCount / plan.limits.members) * 100,
      },
      projects: {
        current: projectCount,
        limit: plan.limits.projects,
        percentage: plan.limits.projects === -1 ? 0 : (projectCount / plan.limits.projects) * 100,
      },
      apiRequests: {
        current: apiRequestCount,
        limit: plan.limits.apiRequests,
        percentage:
          plan.limits.apiRequests === -1 ? 0 : (apiRequestCount / plan.limits.apiRequests) * 100,
      },
      webhooks: {
        current: webhookCount,
        limit: plan.limits.webhookEndpoints,
        percentage:
          plan.limits.webhookEndpoints === -1
            ? 0
            : (webhookCount / plan.limits.webhookEndpoints) * 100,
      },
      apiKeys: {
        current: apiKeyCount,
        limit: plan.limits.apiKeys,
        percentage: plan.limits.apiKeys === -1 ? 0 : (apiKeyCount / plan.limits.apiKeys) * 100,
      },
    },
  };
}

export { getStripe };
