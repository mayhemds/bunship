/**
 * Organization member management routes
 * Handles team member listing, role updates, and removal
 */
import { Elysia } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requirePermission, requireOwner } from "../../middleware/roles";
import { getDatabase, eq, and } from "@bunship/database";
import { memberships, users } from "@bunship/database/schema";
import { ValidationError, NotFoundError, ConflictError, AuthorizationError } from "@bunship/utils";
import {
  MemberSchema,
  MembersListSchema,
  UpdateMemberRoleSchema,
  MessageSchema,
  ErrorSchema,
} from "./schemas";

export const memberRoutes = new Elysia({
  prefix: "/:orgId/members",
  tags: ["Members"],
})
  .use(authMiddleware)
  .use(organizationMiddleware)
  /**
   * List organization members
   */
  .get(
    "/",
    async ({ organization }) => {
      const db = getDatabase();

      const orgMembers = await db.query.memberships.findMany({
        where: eq(memberships.organizationId, organization.id),
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: (memberships, { asc }) => [asc(memberships.role), asc(memberships.createdAt)],
      });

      const members = orgMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        organizationId: m.organizationId,
        role: m.role,
        user: {
          id: m.user.id,
          email: m.user.email,
          fullName: m.user.fullName,
          avatarUrl: m.user.avatarUrl,
        },
        joinedAt: m.createdAt.toISOString(),
      }));

      return {
        members,
        total: members.length,
      };
    },
    {
      beforeHandle: requirePermission("members:read"),
      response: {
        200: MembersListSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "List members",
        description: "Returns all members of the organization. Requires members:read permission.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Update member role
   */
  .patch(
    "/:memberId",
    async ({ organization, membership, params, body, set }) => {
      const db = getDatabase();

      // Get target membership
      const targetMembership = await db.query.memberships.findFirst({
        where: and(
          eq(memberships.id, params.memberId),
          eq(memberships.organizationId, organization.id)
        ),
        with: {
          user: {
            columns: {
              id: true,
              email: true,
              fullName: true,
              avatarUrl: true,
            },
          },
        },
      });

      if (!targetMembership) {
        set.status = 404;
        throw new NotFoundError("Member");
      }

      // Cannot change owner role
      if (targetMembership.role === "owner") {
        set.status = 400;
        throw new ValidationError("Cannot change owner role. Transfer ownership first.");
      }

      // Cannot change your own role
      if (targetMembership.userId === membership.userId) {
        set.status = 400;
        throw new ValidationError("Cannot change your own role");
      }

      // Update role
      const [updated] = await db
        .update(memberships)
        .set({ role: body.role })
        .where(eq(memberships.id, params.memberId))
        .returning();

      if (!updated) {
        throw new NotFoundError("Member");
      }

      return {
        id: updated.id,
        userId: updated.userId,
        organizationId: updated.organizationId,
        role: updated.role,
        user: {
          id: targetMembership.user.id,
          email: targetMembership.user.email,
          fullName: targetMembership.user.fullName,
          avatarUrl: targetMembership.user.avatarUrl,
        },
        joinedAt: updated.createdAt.toISOString(),
      };
    },
    {
      beforeHandle: requirePermission("members:update"),
      body: UpdateMemberRoleSchema,
      response: {
        200: MemberSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "Update member role",
        description:
          "Updates a member's role. Cannot change owner role or your own role. Requires members:update permission.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Remove member from organization
   */
  .delete(
    "/:memberId",
    async ({ organization, membership, params, set }) => {
      const db = getDatabase();

      // Get target membership
      const targetMembership = await db.query.memberships.findFirst({
        where: and(
          eq(memberships.id, params.memberId),
          eq(memberships.organizationId, organization.id)
        ),
      });

      if (!targetMembership) {
        set.status = 404;
        throw new NotFoundError("Member");
      }

      // Cannot remove owner
      if (targetMembership.role === "owner") {
        set.status = 400;
        throw new ValidationError("Cannot remove organization owner. Transfer ownership first.");
      }

      // Cannot remove yourself
      if (targetMembership.userId === membership.userId) {
        set.status = 400;
        throw new ValidationError("Cannot remove yourself. Use leave organization instead.");
      }

      // Remove membership
      await db.delete(memberships).where(eq(memberships.id, params.memberId));

      return { message: "Member removed successfully" };
    },
    {
      beforeHandle: requirePermission("members:remove"),
      response: {
        200: MessageSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "Remove member",
        description:
          "Removes a member from the organization. Cannot remove owner or yourself. Requires members:remove permission.",
        security: [{ bearerAuth: [] }],
      },
    }
  );
