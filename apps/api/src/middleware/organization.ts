/**
 * Organization middleware
 * Validates org access and attaches org context
 */
import { Elysia } from "elysia";
import { getDatabase, eq, and, isNull } from "@bunship/database";
import { organizations, memberships } from "@bunship/database/schema";
import { NotFoundError, AuthorizationError } from "@bunship/utils";

export const organizationMiddleware = new Elysia({ name: "organization" }).derive(
  { as: "scoped" },
  async (context) => {
    const { params, set } = context;
    const orgId = (params as { orgId?: string }).orgId;
    const user = (context as { user?: { id: string } }).user;

    if (!user) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    if (!orgId) {
      set.status = 400;
      throw new Error("Organization ID required");
    }

    const db = getDatabase();

    // Get organization
    const organization = await db.query.organizations.findFirst({
      where: and(eq(organizations.id, orgId), isNull(organizations.deletedAt)),
    });

    if (!organization) {
      set.status = 404;
      throw new NotFoundError("Organization");
    }

    // Get user's membership
    const membership = await db.query.memberships.findFirst({
      where: and(eq(memberships.userId, user.id), eq(memberships.organizationId, orgId)),
    });

    if (!membership) {
      set.status = 403;
      throw new AuthorizationError("Not a member of this organization");
    }

    return { organization, membership };
  }
);
