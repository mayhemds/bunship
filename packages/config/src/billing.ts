/**
 * Billing configuration
 * Stripe plans and pricing
 */
export const billingConfig = {
  currency: "usd",
  plans: [
    {
      id: "free",
      name: "Free",
      description: "For side projects and experimentation",
      price: { monthly: 0, yearly: 0 },
      stripePriceIds: { monthly: null, yearly: null },
      limits: {
        members: 2,
        projects: 3,
        apiRequests: 1000,
        webhookEndpoints: 1,
        apiKeys: 1,
        storageGB: 0.5,
      },
      features: [
        "Up to 2 team members",
        "3 projects",
        "1,000 API requests/month",
        "Community support",
      ],
    },
    {
      id: "pro",
      name: "Pro",
      description: "For growing teams and businesses",
      price: { monthly: 29, yearly: 290 },
      stripePriceIds: {
        monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? "price_pro_monthly",
        yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID ?? "price_pro_yearly",
      },
      limits: {
        members: 10,
        projects: 25,
        apiRequests: 100000,
        webhookEndpoints: 10,
        apiKeys: 10,
        storageGB: 10,
      },
      features: [
        "Up to 10 team members",
        "25 projects",
        "100K API requests/month",
        "Webhooks",
        "API access",
        "Priority support",
        "Audit logs (30 days)",
      ],
      popular: true,
    },
    {
      id: "enterprise",
      name: "Enterprise",
      description: "For large organizations with advanced needs",
      price: { monthly: 99, yearly: 990 },
      stripePriceIds: {
        monthly: process.env.STRIPE_ENTERPRISE_MONTHLY_PRICE_ID ?? "price_enterprise_monthly",
        yearly: process.env.STRIPE_ENTERPRISE_YEARLY_PRICE_ID ?? "price_enterprise_yearly",
      },
      limits: {
        members: -1, // unlimited
        projects: -1, // unlimited
        apiRequests: -1, // unlimited
        webhookEndpoints: -1, // unlimited
        apiKeys: 50,
        storageGB: 100,
      },
      features: [
        "Unlimited team members",
        "Unlimited projects",
        "Unlimited API requests",
        "Advanced webhooks",
        "Priority API access",
        "24/7 priority support",
        "Audit logs (1 year)",
        "SSO/SAML (coming soon)",
        "Custom integrations",
        "SLA guarantee",
      ],
    },
  ],
} as const;

export type BillingConfig = typeof billingConfig;
export type PlanId = (typeof billingConfig.plans)[number]["id"];
export type Plan = (typeof billingConfig.plans)[number];

/**
 * Get a plan by ID
 */
export function getPlan(planId: string): Plan | undefined {
  return billingConfig.plans.find((plan) => plan.id === planId);
}

/**
 * Check if a limit is unlimited (-1)
 */
export function isUnlimited(limit: number): boolean {
  return limit === -1;
}

/**
 * Check if usage is within plan limits
 */
export function isWithinLimit(usage: number, limit: number): boolean {
  return isUnlimited(limit) || usage < limit;
}
