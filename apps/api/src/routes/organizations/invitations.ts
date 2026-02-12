/**
 * Organization invitation management routes
 * Handles team invitation creation, listing, cancellation, and acceptance
 */
import { Elysia, t as Type } from "elysia";
import { authMiddleware, optionalAuthMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requirePermission } from "../../middleware/roles";
import { getDatabase, eq, and, isNull } from "@bunship/database";
import { invitations, memberships, users, organizations } from "@bunship/database/schema";
import { generateToken, hashToken } from "../../lib/crypto";
import { createId } from "@paralleldrive/cuid2";
import { ValidationError, NotFoundError, ConflictError, AuthenticationError } from "@bunship/utils";
import { isValidEmail } from "@bunship/utils";
import { appConfig } from "@bunship/config";
import {
  InvitationSchema,
  InvitationsListSchema,
  CreateInvitationSchema,
  InvitationCreatedSchema,
  MessageSchema,
  ErrorSchema,
} from "./schemas";

/**
 * Org-scoped invitation routes (list, create, cancel)
 * These require org membership via organizationMiddleware
 */
const orgInvitationRoutes = new Elysia({
  prefix: "/:orgId/invitations",
  tags: ["Invitations"],
})
  .use(authMiddleware)
  .use(organizationMiddleware)
  /**
   * List pending invitations for organization
   */
  .get(
    "/",
    async ({ organization, user }) => {
      const db = getDatabase();

      const orgInvitations = await db.query.invitations.findMany({
        where: and(eq(invitations.organizationId, organization.id), isNull(invitations.acceptedAt)),
        with: {
          invitedByUser: {
            columns: {
              id: true,
              email: true,
              fullName: true,
            },
          },
        },
        orderBy: (invitations, { desc }) => [desc(invitations.createdAt)],
      });

      const now = new Date();
      const invites = orgInvitations.map((inv) => ({
        id: inv.id,
        organizationId: inv.organizationId,
        email: inv.email,
        role: inv.role,
        invitedBy: {
          id: inv.invitedByUser.id,
          email: inv.invitedByUser.email,
          fullName: inv.invitedByUser.fullName,
        },
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
        status: inv.acceptedAt
          ? ("accepted" as const)
          : inv.expiresAt < now
            ? ("expired" as const)
            : ("pending" as const),
      }));

      return {
        invitations: invites,
        total: invites.length,
      };
    },
    {
      beforeHandle: [requirePermission("invitations:read")],
      response: {
        200: InvitationsListSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "List invitations",
        description:
          "Returns all pending invitations for the organization. Requires invitations:read permission.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Create new invitation
   */
  .post(
    "/",
    async ({ organization, user, body, set }) => {
      const db = getDatabase();

      // Validate email format
      if (!isValidEmail(body.email)) {
        set.status = 400;
        throw new ValidationError("Invalid email address");
      }

      // Check if user already exists and is a member
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, body.email.toLowerCase()),
      });

      if (existingUser) {
        const existingMembership = await db.query.memberships.findFirst({
          where: and(
            eq(memberships.userId, existingUser.id),
            eq(memberships.organizationId, organization.id)
          ),
        });

        if (existingMembership) {
          set.status = 409;
          throw new ConflictError("User is already a member of this organization");
        }
      }

      // Check for pending invitation
      const pendingInvitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.organizationId, organization.id),
          eq(invitations.email, body.email.toLowerCase()),
          isNull(invitations.acceptedAt)
        ),
      });

      if (pendingInvitation && pendingInvitation.expiresAt > new Date()) {
        set.status = 409;
        throw new ConflictError("An invitation for this email is already pending");
      }

      // Generate invitation token
      const token = generateToken(32);
      const tokenHash = await hashToken(token);

      // Create invitation (expires in 7 days)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const [invitation] = await db
        .insert(invitations)
        .values({
          organizationId: organization.id,
          email: body.email.toLowerCase(),
          role: body.role,
          tokenHash,
          invitedBy: user.id,
          expiresAt,
        })
        .returning();

      // Get inviter details
      const inviter = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: {
          id: true,
          email: true,
          fullName: true,
        },
      });

      // Generate invite URL
      const inviteUrl = `${appConfig.url}/invite/${token}`;

      // TODO: Send invitation email using email service

      return {
        invitation: {
          id: invitation.id,
          organizationId: invitation.organizationId,
          email: invitation.email,
          role: invitation.role,
          invitedBy: {
            id: inviter!.id,
            email: inviter!.email,
            fullName: inviter!.fullName,
          },
          expiresAt: invitation.expiresAt.toISOString(),
          createdAt: invitation.createdAt.toISOString(),
          status: "pending" as const,
        },
        inviteUrl,
      };
    },
    {
      beforeHandle: [requirePermission("invitations:create")],
      body: CreateInvitationSchema,
      response: {
        201: InvitationCreatedSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
        409: ErrorSchema,
      },
      detail: {
        summary: "Create invitation",
        description:
          "Sends an invitation to join the organization. Requires invitations:create permission.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Cancel pending invitation
   */
  .delete(
    "/:invitationId",
    async ({ organization, params, set }) => {
      const db = getDatabase();

      // Get invitation
      const invitation = await db.query.invitations.findFirst({
        where: and(
          eq(invitations.id, params.invitationId),
          eq(invitations.organizationId, organization.id)
        ),
      });

      if (!invitation) {
        set.status = 404;
        throw new NotFoundError("Invitation");
      }

      // Check if already accepted
      if (invitation.acceptedAt) {
        set.status = 400;
        throw new ValidationError("Cannot cancel an accepted invitation");
      }

      // Delete invitation
      await db.delete(invitations).where(eq(invitations.id, params.invitationId));

      return { message: "Invitation cancelled successfully" };
    },
    {
      beforeHandle: [requirePermission("invitations:delete")],
      response: {
        200: MessageSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        403: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "Cancel invitation",
        description: "Cancels a pending invitation. Requires invitations:delete permission.",
        security: [{ bearerAuth: [] }],
      },
    }
  );

/**
 * Public invitation accept endpoint (no org middleware needed)
 */
const acceptInvitationRoute = new Elysia({ tags: ["Invitations"] }).post(
  "/invitations/:token/accept",
  async ({ params, user, set }) => {
    const db = getDatabase();

    // Hash token to find invitation
    const tokenHash = await hashToken(params.token);

    const invitation = await db.query.invitations.findFirst({
      where: and(eq(invitations.tokenHash, tokenHash), isNull(invitations.acceptedAt)),
      with: {
        organization: {
          columns: {
            id: true,
            name: true,
            slug: true,
            deletedAt: true,
          },
        },
      },
    });

    if (!invitation) {
      set.status = 404;
      throw new NotFoundError("Invitation");
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      set.status = 400;
      throw new ValidationError("Invitation has expired");
    }

    // Check if organization still exists
    if (!invitation.organization || invitation.organization.deletedAt) {
      set.status = 400;
      throw new ValidationError("Organization no longer exists");
    }

    // Verify email matches (if authenticated)
    if (user && user.email !== invitation.email) {
      set.status = 400;
      throw new ValidationError("This invitation is for a different email address");
    }

    // If not authenticated, user needs to sign up/login first
    if (!user) {
      set.status = 401;
      throw new AuthenticationError(
        "Please sign up or log in with the invited email address to accept this invitation"
      );
    }

    // Check if already a member
    const existingMembership = await db.query.memberships.findFirst({
      where: and(
        eq(memberships.userId, user.id),
        eq(memberships.organizationId, invitation.organizationId)
      ),
    });

    if (existingMembership) {
      set.status = 409;
      throw new ConflictError("You are already a member of this organization");
    }

    // Create membership
    await db.insert(memberships).values({
      userId: user.id,
      organizationId: invitation.organizationId,
      role: invitation.role,
    });

    // Mark invitation as accepted
    await db
      .update(invitations)
      .set({ acceptedAt: new Date() })
      .where(eq(invitations.id, invitation.id));

    return {
      message: "Invitation accepted successfully",
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug,
      },
    };
  },
  {
    beforeHandle: [optionalAuthMiddleware],
    response: {
      200: Type.Object({
        message: Type.String(),
        organization: Type.Object({
          id: Type.String(),
          name: Type.String(),
          slug: Type.String(),
        }),
      }),
      400: ErrorSchema,
      401: ErrorSchema,
      404: ErrorSchema,
      409: ErrorSchema,
    },
    detail: {
      summary: "Accept invitation",
      description:
        "Accepts an invitation using the token from the invite link. User must be authenticated.",
      security: [{ bearerAuth: [] }],
    },
  }
);

export const invitationRoutes = new Elysia()
  .use(orgInvitationRoutes)
  .use(acceptInvitationRoute);
