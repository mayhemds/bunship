/**
 * Billing Service Tests
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";

// ── Mock environment variable so the module-level check passes ──────────────
process.env.STRIPE_SECRET_KEY = "sk_test_fake_key_for_testing";

// ── Stripe mock ─────────────────────────────────────────────────────────────
const mockStripeCustomersCreate = mock(() => Promise.resolve({ id: "cus_test123" }));
const mockStripeCheckoutSessionsCreate = mock(() =>
  Promise.resolve({
    id: "cs_test_session",
    url: "https://checkout.stripe.com/pay/cs_test_session",
  })
);
const mockStripeInvoicesList = mock(() =>
  Promise.resolve({
    data: [
      {
        id: "inv_1",
        number: "INV-001",
        status: "paid",
        amount_due: 2999,
        currency: "usd",
        created: 1700000000,
        due_date: null,
        status_transitions: { paid_at: 1700000100 },
        hosted_invoice_url: "https://invoice.stripe.com/inv_1",
        invoice_pdf: "https://invoice.stripe.com/inv_1.pdf",
      },
      {
        id: "inv_2",
        number: "INV-002",
        status: "open",
        amount_due: 4999,
        currency: "usd",
        created: 1700100000,
        due_date: 1700200000,
        status_transitions: { paid_at: null },
        hosted_invoice_url: "https://invoice.stripe.com/inv_2",
        invoice_pdf: null,
      },
    ],
  })
);
const mockStripeBillingPortalCreate = mock(() =>
  Promise.resolve({ id: "bps_1", url: "https://billing.stripe.com/session/bps_1" })
);
const mockStripeSubscriptionsUpdate = mock(() =>
  Promise.resolve({ cancel_at: 1700500000, cancel_at_period_end: true })
);

class StripeMock {
  customers = { create: mockStripeCustomersCreate };
  checkout = { sessions: { create: mockStripeCheckoutSessionsCreate } };
  invoices = { list: mockStripeInvoicesList };
  billingPortal = { sessions: { create: mockStripeBillingPortalCreate } };
  subscriptions = { update: mockStripeSubscriptionsUpdate };
}

mock.module("stripe", () => ({
  default: StripeMock,
  Stripe: StripeMock,
}));
// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockSubFindFirst = mock(() => Promise.resolve(null));
const mockOrgFindFirst = mock(() => Promise.resolve({ id: "org-1", name: "Test Org" }));
const mockDbInsert = mock(() => ({ values: mock(() => Promise.resolve()) }));
const mockDbUpdate = mock(() => ({
  set: mock(() => ({ where: mock(() => Promise.resolve()) })),
}));

mockDatabase({
  getDatabase: () => ({
    insert: mockDbInsert,
    update: mockDbUpdate,
    query: {
      subscriptions: { findFirst: mockSubFindFirst },
      organizations: { findFirst: mockOrgFindFirst },
      auditLogs: { findMany: mock(() => Promise.resolve([])) },
      memberships: { findMany: mock(() => Promise.resolve([])) },
      projects: { findMany: mock(() => Promise.resolve([])) },
      webhooks: { findMany: mock(() => Promise.resolve([])) },
      apiKeys: { findMany: mock(() => Promise.resolve([])) },
    },
  }),
});

// ── Import under test (dynamic to ensure mocks are applied first) ───────────
let getInvoices: typeof import("../../services/billing.service").getInvoices;
let createCheckoutSession: typeof import("../../services/billing.service").createCheckoutSession;

beforeAll(async () => {
  const mod = await import("../../services/billing.service");
  getInvoices = mod.getInvoices;
  createCheckoutSession = mod.createCheckoutSession;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("billing.service", () => {
  beforeEach(() => {
    mockSubFindFirst.mockReset();
    mockOrgFindFirst.mockReset();
    mockStripeCustomersCreate.mockClear();
    mockStripeCheckoutSessionsCreate.mockClear();
    mockStripeInvoicesList.mockClear();

    // Default: no existing subscription, org exists
    mockSubFindFirst.mockResolvedValue(null);
    mockOrgFindFirst.mockResolvedValue({ id: "org-1", name: "Test Org" });
  });

  // ── getInvoices ───────────────────────────────────────────────────────
  describe("getInvoices", () => {
    it("caps the limit at 100 when a larger value is provided", async () => {
      await getInvoices("org-1", 200);

      expect(mockStripeInvoicesList).toHaveBeenCalled();
      const callArgs = mockStripeInvoicesList.mock.calls[0][0] as { limit: number };
      expect(callArgs.limit).toBe(100);
    });

    it("passes through a limit within range", async () => {
      await getInvoices("org-1", 25);

      const callArgs = mockStripeInvoicesList.mock.calls[0][0] as { limit: number };
      expect(callArgs.limit).toBe(25);
    });

    it("defaults to 10 when no limit is given", async () => {
      await getInvoices("org-1");

      const callArgs = mockStripeInvoicesList.mock.calls[0][0] as { limit: number };
      expect(callArgs.limit).toBe(10);
    });

    it("clamps limit to at least 1", async () => {
      await getInvoices("org-1", 0);

      const callArgs = mockStripeInvoicesList.mock.calls[0][0] as { limit: number };
      expect(callArgs.limit).toBe(1);
    });

    it("returns mapped invoice data", async () => {
      const invoices = await getInvoices("org-1", 10);

      expect(invoices).toHaveLength(2);
      expect(invoices[0].id).toBe("inv_1");
      expect(invoices[0].status).toBe("paid");
      expect(invoices[0].amount).toBe(2999);
      expect(invoices[0].paidAt).toBeInstanceOf(Date);
      expect(invoices[1].paidAt).toBeNull();
    });
  });

  // ── createCheckoutSession ─────────────────────────────────────────────
  describe("createCheckoutSession", () => {
    it("calls Stripe with correct params for a valid price", async () => {
      const session = await createCheckoutSession("org-1", "price_pro_monthly");

      expect(mockStripeCheckoutSessionsCreate).toHaveBeenCalledTimes(1);
      const callArgs = mockStripeCheckoutSessionsCreate.mock.calls[0][0] as Record<string, any>;
      expect(callArgs.customer).toBe("cus_test123");
      expect(callArgs.mode).toBe("subscription");
      expect(callArgs.line_items[0].price).toBe("price_pro_monthly");
      expect(callArgs.line_items[0].quantity).toBe(1);
      expect(callArgs.metadata.organizationId).toBe("org-1");
      expect(callArgs.metadata.planId).toBe("pro");
    });

    it("throws ValidationError for an invalid price ID", async () => {
      await expect(createCheckoutSession("org-1", "price_nonexistent")).rejects.toThrow(
        "Invalid price ID"
      );
    });

    it("uses default success and cancel URLs when not provided", async () => {
      await createCheckoutSession("org-1", "price_pro_yearly");

      const callArgs = mockStripeCheckoutSessionsCreate.mock.calls[0][0] as Record<string, any>;
      expect(callArgs.success_url).toContain("success=true");
      expect(callArgs.cancel_url).toContain("canceled=true");
    });

    it("uses custom success and cancel URLs when provided", async () => {
      await createCheckoutSession(
        "org-1",
        "price_pro_monthly",
        "https://custom.com/success",
        "https://custom.com/cancel"
      );

      const callArgs = mockStripeCheckoutSessionsCreate.mock.calls[0][0] as Record<string, any>;
      expect(callArgs.success_url).toBe("https://custom.com/success");
      expect(callArgs.cancel_url).toBe("https://custom.com/cancel");
    });
  });

  // ── Stripe API failure ────────────────────────────────────────────────
  describe("Stripe API failure handling", () => {
    it("propagates Stripe errors from invoices list", async () => {
      mockStripeInvoicesList.mockRejectedValueOnce(new Error("Stripe API rate limited"));

      await expect(getInvoices("org-1")).rejects.toThrow("Stripe API rate limited");
    });

    it("propagates Stripe errors from checkout session creation", async () => {
      mockStripeCheckoutSessionsCreate.mockRejectedValueOnce(new Error("Card declined"));

      await expect(createCheckoutSession("org-1", "price_pro_monthly")).rejects.toThrow(
        "Card declined"
      );
    });
  });
});
