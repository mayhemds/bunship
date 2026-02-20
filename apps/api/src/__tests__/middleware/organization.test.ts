/**
 * Organization Middleware Tests
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";
import { Elysia } from "elysia";
import { NotFoundError, AuthorizationError } from "@bunship/utils";

// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockOrgFindFirst = mock(() => Promise.resolve(null));
const mockMembershipFindFirst = mock(() => Promise.resolve(null));

mockDatabase({
  getDatabase: () => ({
    query: {
      organizations: { findFirst: mockOrgFindFirst },
      memberships: { findFirst: mockMembershipFindFirst },
    },
  }),
});

let organizationMiddleware: typeof import("../../middleware/organization").organizationMiddleware;

beforeAll(async () => {
  const mod = await import("../../middleware/organization");
  organizationMiddleware = mod.organizationMiddleware;
});

// ── Helper: build a test Elysia app ────────────────────────────────────────
function createTestApp(preMiddleware?: (app: Elysia) => Elysia) {
  let app = new Elysia();

  // Apply a "pre" middleware that sets user in context, simulating a prior auth step
  if (preMiddleware) {
    app = preMiddleware(app);
  }

  return app
    .use(organizationMiddleware)
    .get("/orgs/:orgId/data", ({ organization, membership }: any) => ({
      orgName: organization.name,
      memberRole: membership.role,
    }))
    .onError(({ error, set }) => {
      if (error instanceof NotFoundError) {
        set.status = 404;
        return { error: { message: error.message } };
      }
      if (error instanceof AuthorizationError) {
        set.status = 403;
        return { error: { message: error.message } };
      }
      // The middleware throws plain Errors for auth/missing params
      if (error.message === "Authentication required") {
        set.status = 401;
        return { error: { message: error.message } };
      }
      if (error.message === "Organization ID required") {
        set.status = 400;
        return { error: { message: error.message } };
      }
      set.status = 500;
      return { error: { message: error.message } };
    });
}

/**
 * Simulates the auth middleware by injecting a user into the context via derive.
 */
function withAuthUser(userId: string) {
  return (app: Elysia) =>
    app.derive(() => ({
      user: { id: userId, email: "test@example.com" },
    })) as unknown as Elysia;
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe("organizationMiddleware", () => {
  beforeEach(() => {
    mockOrgFindFirst.mockReset();
    mockMembershipFindFirst.mockReset();
  });

  it("returns 401 if no user is in the context (not authenticated)", async () => {
    // No pre-middleware, so user is undefined
    const app = createTestApp();

    const response = await app.handle(new Request("http://localhost/orgs/org-1/data"));

    expect(response.status).toBe(401);
    const text = await response.text();
    expect(text.toLowerCase()).toContain("authentication required");
  });

  it("returns 404 for a non-existent organization ID", async () => {
    mockOrgFindFirst.mockResolvedValueOnce(null);

    const app = createTestApp(withAuthUser("user-1"));

    const response = await app.handle(new Request("http://localhost/orgs/org-nonexistent/data"));

    expect(response.status).toBe(404);
    const text = await response.text();
    expect(text.toLowerCase()).toContain("not found");
  });

  it("returns 403 if the user is not a member of the organization", async () => {
    mockOrgFindFirst.mockResolvedValueOnce({
      id: "org-1",
      name: "Acme Corp",
      deletedAt: null,
    });
    mockMembershipFindFirst.mockResolvedValueOnce(null);

    const app = createTestApp(withAuthUser("user-outsider"));

    const response = await app.handle(new Request("http://localhost/orgs/org-1/data"));

    expect(response.status).toBe(403);
    const text = await response.text();
    expect(text.toLowerCase()).toContain("not a member");
  });

  it("sets organization and membership in context for a valid member", async () => {
    mockOrgFindFirst.mockResolvedValueOnce({
      id: "org-1",
      name: "Acme Corp",
      deletedAt: null,
    });
    mockMembershipFindFirst.mockResolvedValueOnce({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "admin",
    });

    const app = createTestApp(withAuthUser("user-1"));

    const response = await app.handle(new Request("http://localhost/orgs/org-1/data"));

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orgName).toBe("Acme Corp");
    expect(body.memberRole).toBe("admin");
  });

  it("queries both organization and membership tables", async () => {
    mockOrgFindFirst.mockResolvedValueOnce({
      id: "org-1",
      name: "Test Org",
      deletedAt: null,
    });
    mockMembershipFindFirst.mockResolvedValueOnce({
      id: "mem-1",
      userId: "user-1",
      organizationId: "org-1",
      role: "member",
    });

    const app = createTestApp(withAuthUser("user-1"));

    await app.handle(new Request("http://localhost/orgs/org-1/data"));

    expect(mockOrgFindFirst).toHaveBeenCalledTimes(1);
    expect(mockMembershipFindFirst).toHaveBeenCalledTimes(1);
  });
});
