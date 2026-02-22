/**
 * End-to-end organization lifecycle test.
 *
 * Exercises the full multi-user organization flow:
 *   1. Register + login user A
 *   2. User A creates an organization
 *   3. User A invites user B (register + login user B)
 *   4. User B accepts the invitation
 *   5. Both users can access the organization
 *   6. User A updates user B's member role
 *   7. User A removes user B from the organization
 *
 * All steps depend on the database being available. The suite is skipped
 * gracefully when the database cannot be reached.
 */
import { describe, it, expect, beforeAll } from "bun:test";
import {
  request,
  getApp,
  registerAndLogin,
  uniqueEmail,
  isDatabaseAvailable,
} from "../helpers/setup";

let dbAvailable = false;

beforeAll(async () => {
  getApp();
  dbAvailable = await isDatabaseAvailable();

  if (!dbAvailable) {
    console.warn("[org-flow.test] Database is not available -- skipping E2E org flow.");
  }
});

describe("E2E: organization lifecycle", () => {
  // Shared state across ordered steps
  let userA: { accessToken: string; email: string; userId: string };
  let userB: { accessToken: string; email: string; userId: string };
  let orgId: string;
  let orgSlug: string;
  let inviteUrl: string;
  let inviteToken: string;
  let memberBId: string; // membership ID of user B

  // -----------------------------------------------------------------------
  // Step 1 - Register + login user A
  // -----------------------------------------------------------------------
  it("Step 1: registers and logs in user A", async () => {
    if (!dbAvailable) return;

    const result = await registerAndLogin({ fullName: "User A" });
    userA = {
      accessToken: result.accessToken,
      email: result.email,
      userId: result.userId,
    };

    expect(userA.accessToken).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Step 2 - User A creates an organization
  // -----------------------------------------------------------------------
  it("Step 2: user A creates an organization", async () => {
    if (!dbAvailable) return;

    const slug = `test-org-${Date.now()}`;
    const res = await request("POST", "/api/v1/organizations", {
      token: userA.accessToken,
      body: {
        name: "Test Organization",
        slug,
        description: "Created during E2E test",
      },
    });

    // Elysia may return 200 or 201 depending on route configuration
    expect([200, 201]).toContain(res.status);
    expect(res.body).toHaveProperty("id");
    expect(res.body).toHaveProperty("slug", slug);

    orgId = res.body.id;
    orgSlug = slug;
  });

  // -----------------------------------------------------------------------
  // Step 3 - Register + login user B; user A invites user B
  // -----------------------------------------------------------------------
  it("Step 3: registers user B and user A sends an invitation", async () => {
    if (!dbAvailable) return;

    const bEmail = uniqueEmail();
    const bResult = await registerAndLogin({
      email: bEmail,
      fullName: "User B",
    });
    userB = {
      accessToken: bResult.accessToken,
      email: bResult.email,
      userId: bResult.userId,
    };

    // User A invites user B
    const invRes = await request("POST", `/api/v1/organizations/${orgId}/invitations`, {
      token: userA.accessToken,
      body: { email: userB.email, role: "member" },
    });

    // Expect 200 or 201
    expect([200, 201]).toContain(invRes.status);
    expect(invRes.body).toHaveProperty("invitation");
    expect(invRes.body).toHaveProperty("inviteUrl");

    inviteUrl = invRes.body.inviteUrl;
    // Extract the token from the invite URL (last path segment)
    const urlParts = inviteUrl.split("/");
    inviteToken = urlParts[urlParts.length - 1];

    expect(inviteToken).toBeTruthy();
  });

  // -----------------------------------------------------------------------
  // Step 4 - User B accepts the invitation
  // -----------------------------------------------------------------------
  it("Step 4: user B accepts the invitation", async () => {
    if (!dbAvailable) return;

    const res = await request("POST", `/api/v1/organizations/invitations/${inviteToken}/accept`, {
      token: userB.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body).toHaveProperty("organization");
    expect(res.body.organization).toHaveProperty("id", orgId);
  });

  // -----------------------------------------------------------------------
  // Step 5 - Both users can access the organization
  // -----------------------------------------------------------------------
  it("Step 5a: user A can access the organization", async () => {
    if (!dbAvailable) return;

    const res = await request("GET", `/api/v1/organizations/${orgId}`, {
      token: userA.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", orgId);
  });

  it("Step 5b: user B can access the organization", async () => {
    if (!dbAvailable) return;

    const res = await request("GET", `/api/v1/organizations/${orgId}`, {
      token: userB.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("id", orgId);
  });

  // -----------------------------------------------------------------------
  // Step 6 - User A updates user B's role
  // -----------------------------------------------------------------------
  it("Step 6: user A updates user B's member role to admin", async () => {
    if (!dbAvailable) return;

    // First, list members to find user B's membership ID
    const listRes = await request("GET", `/api/v1/organizations/${orgId}/members`, {
      token: userA.accessToken,
    });

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveProperty("members");
    expect(listRes.body.members.length).toBeGreaterThanOrEqual(2);

    const bMember = listRes.body.members.find(
      (m: any) => m.userId === userB.userId || m.user?.email === userB.email
    );
    expect(bMember).toBeTruthy();
    memberBId = bMember.id;

    // Update role
    const res = await request("PATCH", `/api/v1/organizations/${orgId}/members/${memberBId}`, {
      token: userA.accessToken,
      body: { role: "admin" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("role", "admin");
  });

  // -----------------------------------------------------------------------
  // Step 7 - User A removes user B from the organization
  // -----------------------------------------------------------------------
  it("Step 7: user A removes user B from the organization", async () => {
    if (!dbAvailable) return;

    const res = await request("DELETE", `/api/v1/organizations/${orgId}/members/${memberBId}`, {
      token: userA.accessToken,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("message");
    expect(res.body.message.toLowerCase()).toContain("removed");
  });

  // -----------------------------------------------------------------------
  // Step 7b - Verify user B can no longer access the organization
  // -----------------------------------------------------------------------
  it("Step 7b: user B is denied access to the organization after removal", async () => {
    if (!dbAvailable) return;

    const res = await request("GET", `/api/v1/organizations/${orgId}`, {
      token: userB.accessToken,
    });

    // Should be 403 (forbidden) or 404 (not found for this user)
    expect([403, 404]).toContain(res.status);
  });
});

// ---------------------------------------------------------------------------
// Edge case: user A cannot delete account while owning an org
// ---------------------------------------------------------------------------
describe("E2E: account deletion blocked by org ownership", () => {
  it("prevents deletion when user owns an organization", async () => {
    if (!dbAvailable) return;

    const owner = await registerAndLogin({ fullName: "Org Owner" });

    // Create an org
    const orgRes = await request("POST", "/api/v1/organizations", {
      token: owner.accessToken,
      body: {
        name: "Owned Org",
        slug: `owned-org-${Date.now()}`,
      },
    });
    expect([200, 201]).toContain(orgRes.status);

    // Attempt to delete account
    const delRes = await request("DELETE", "/api/v1/users/me", {
      token: owner.accessToken,
    });

    expect(delRes.status).toBe(400);
    expect(delRes.body).toHaveProperty("error");
  });
});
