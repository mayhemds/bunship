/**
 * User management routes
 * Handles user profile, password changes, sessions, and organization membership
 */
import { Elysia } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { getDatabase, eq, and, ne, isNull } from "@bunship/database";
import { users, sessions, memberships, organizations } from "@bunship/database/schema";
import { hashPassword, verifyPassword } from "../../lib/password";
import { generateToken, hashToken } from "../../lib/crypto";
import { verifyAccessToken } from "../../lib/jwt";
import { ValidationError, AuthenticationError, NotFoundError, ConflictError } from "@bunship/utils";
import { isValidPassword } from "@bunship/utils";
import {
  UserSchema,
  UpdateProfileSchema,
  ChangePasswordSchema,
  SessionSchema,
  SessionsListSchema,
  OrganizationsListSchema,
  MessageSchema,
  ErrorSchema,
} from "./schemas";

export const userRoutes = new Elysia({ prefix: "/users", tags: ["Users"] })
  .use(authMiddleware)
  /**
   * Get current user profile
   */
  .get(
    "/me",
    async ({ user }) => {
      const db = getDatabase();

      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
      });

      if (!currentUser || !currentUser.isActive) {
        throw new NotFoundError("User");
      }

      return {
        id: currentUser.id,
        email: currentUser.email,
        emailVerified: currentUser.emailVerified?.toISOString() ?? null,
        fullName: currentUser.fullName,
        avatarUrl: currentUser.avatarUrl,
        preferences: currentUser.preferences || {},
        twoFactorEnabled: currentUser.twoFactorEnabled,
        isActive: currentUser.isActive,
        createdAt: currentUser.createdAt.toISOString(),
        updatedAt: currentUser.updatedAt.toISOString(),
      };
    },
    {
      response: {
        200: UserSchema,
        401: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "Get current user",
        description: "Returns the authenticated user's profile information",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Update user profile
   */
  .patch(
    "/me",
    async ({ user, body, set }) => {
      const db = getDatabase();

      // Merge preferences if provided
      const updateData: any = {};
      if (body.fullName !== undefined) {
        updateData.fullName = body.fullName;
      }
      if (body.avatarUrl !== undefined) {
        updateData.avatarUrl = body.avatarUrl;
      }
      if (body.preferences !== undefined) {
        // Get current preferences
        const currentUser = await db.query.users.findFirst({
          where: eq(users.id, user.id),
          columns: { preferences: true },
        });

        updateData.preferences = {
          ...(currentUser?.preferences || {}),
          ...body.preferences,
        };
      }

      const [updated] = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, user.id))
        .returning();

      if (!updated) {
        set.status = 404;
        throw new NotFoundError("User");
      }

      return {
        id: updated.id,
        email: updated.email,
        emailVerified: updated.emailVerified?.toISOString() ?? null,
        fullName: updated.fullName,
        avatarUrl: updated.avatarUrl,
        preferences: updated.preferences || {},
        twoFactorEnabled: updated.twoFactorEnabled,
        isActive: updated.isActive,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      };
    },
    {
      body: UpdateProfileSchema,
      response: {
        200: UserSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "Update user profile",
        description: "Updates the authenticated user's profile information",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Change password
   */
  .put(
    "/me/password",
    async ({ user, body, set }) => {
      const db = getDatabase();

      // Validate new password strength
      const passwordValidation = isValidPassword(body.newPassword);
      if (passwordValidation !== true) {
        set.status = 400;
        throw new ValidationError(passwordValidation);
      }

      // Get current user with password hash
      const currentUser = await db.query.users.findFirst({
        where: eq(users.id, user.id),
        columns: { id: true, passwordHash: true },
      });

      if (!currentUser || !currentUser.passwordHash) {
        set.status = 401;
        throw new AuthenticationError("Invalid credentials");
      }

      // Verify current password
      const isValid = await verifyPassword(body.currentPassword, currentUser.passwordHash);
      if (!isValid) {
        set.status = 401;
        throw new AuthenticationError("Current password is incorrect");
      }

      // Check if new password is different
      const isSamePassword = await verifyPassword(body.newPassword, currentUser.passwordHash);
      if (isSamePassword) {
        set.status = 400;
        throw new ValidationError("New password must be different from current password");
      }

      // Hash and update password
      const newPasswordHash = await hashPassword(body.newPassword);
      await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, user.id));

      // Invalidate all other sessions (keep current one)
      await db
        .delete(sessions)
        .where(and(eq(sessions.userId, user.id), ne(sessions.id, user.sessionId)));

      return { message: "Password changed successfully" };
    },
    {
      body: ChangePasswordSchema,
      response: {
        200: MessageSchema,
        400: ErrorSchema,
        401: ErrorSchema,
      },
      detail: {
        summary: "Change password",
        description:
          "Changes the authenticated user's password. Requires current password verification.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Delete user account
   */
  .delete(
    "/me",
    async ({ user, set }) => {
      const db = getDatabase();

      // Check if user owns any organizations
      const ownedOrgs = await db.query.memberships.findMany({
        where: and(eq(memberships.userId, user.id), eq(memberships.role, "owner")),
      });

      if (ownedOrgs.length > 0) {
        set.status = 400;
        throw new ValidationError(
          "Cannot delete account while owning organizations. Transfer ownership or delete organizations first."
        );
      }

      // Soft delete user
      await db
        .update(users)
        .set({
          deletedAt: new Date(),
          isActive: false,
        })
        .where(eq(users.id, user.id));

      return { message: "Account deleted successfully" };
    },
    {
      response: {
        200: MessageSchema,
        400: ErrorSchema,
        401: ErrorSchema,
      },
      detail: {
        summary: "Delete account",
        description:
          "Soft deletes the authenticated user's account. Cannot delete if user owns organizations.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * List active sessions
   */
  .get(
    "/me/sessions",
    async ({ user, headers }) => {
      const db = getDatabase();

      // Get current session ID from token
      let currentSessionId: string | null = null;
      try {
        const authHeader = headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          const payload = await verifyAccessToken(token);
          currentSessionId = payload.sessionId || null;
        }
      } catch {
        // Ignore token parsing errors for this context
      }

      const userSessions = await db.query.sessions.findMany({
        where: and(
          eq(sessions.userId, user.id)
          // Only show non-expired sessions
          // Note: SQLite doesn't have native date comparison, so we filter in JS
        ),
        orderBy: (sessions, { desc }) => [desc(sessions.lastUsedAt)],
      });

      // Filter expired sessions and format response
      const now = new Date();
      const activeSessions = userSessions
        .filter((session) => session.expiresAt > now)
        .map((session) => ({
          id: session.id,
          userAgent: session.userAgent,
          ipAddress: session.ipAddress,
          lastUsedAt: session.lastUsedAt.toISOString(),
          expiresAt: session.expiresAt.toISOString(),
          createdAt: session.createdAt.toISOString(),
          isCurrent: session.id === currentSessionId,
        }));

      return {
        sessions: activeSessions,
        total: activeSessions.length,
      };
    },
    {
      response: {
        200: SessionsListSchema,
        401: ErrorSchema,
      },
      detail: {
        summary: "List active sessions",
        description: "Returns all active sessions for the authenticated user",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * Revoke a session
   */
  .delete(
    "/me/sessions/:sessionId",
    async ({ user, params, headers, set }) => {
      const db = getDatabase();

      // Check if session exists and belongs to user
      const session = await db.query.sessions.findFirst({
        where: and(eq(sessions.id, params.sessionId), eq(sessions.userId, user.id)),
      });

      if (!session) {
        set.status = 404;
        throw new NotFoundError("Session");
      }

      // Check if trying to revoke current session
      try {
        const authHeader = headers.authorization;
        if (authHeader?.startsWith("Bearer ")) {
          const token = authHeader.slice(7);
          const payload = await verifyAccessToken(token);
          if (payload.sessionId === params.sessionId) {
            set.status = 400;
            throw new ValidationError("Cannot revoke current session. Use logout instead.");
          }
        }
      } catch (error) {
        if (error instanceof ValidationError) throw error;
        // Ignore token parsing errors
      }

      // Delete session
      await db.delete(sessions).where(eq(sessions.id, params.sessionId));

      return { message: "Session revoked successfully" };
    },
    {
      response: {
        200: MessageSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        404: ErrorSchema,
      },
      detail: {
        summary: "Revoke session",
        description: "Revokes a specific session. Cannot revoke the current session.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * List user's organizations
   */
  .get(
    "/me/organizations",
    async ({ user }) => {
      const db = getDatabase();

      const userMemberships = await db.query.memberships.findMany({
        where: eq(memberships.userId, user.id),
        with: {
          organization: {
            columns: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
        orderBy: (memberships, { desc }) => [desc(memberships.createdAt)],
      });

      const orgs = userMemberships
        .filter((m) => m.organization && !(m.organization as any).deletedAt)
        .map((m) => ({
          id: m.organization!.id,
          name: m.organization!.name,
          slug: m.organization!.slug,
          logoUrl: m.organization!.logoUrl,
          role: m.role,
          membershipId: m.id,
          joinedAt: m.createdAt.toISOString(),
        }));

      return {
        organizations: orgs,
        total: orgs.length,
      };
    },
    {
      response: {
        200: OrganizationsListSchema,
        401: ErrorSchema,
      },
      detail: {
        summary: "List user's organizations",
        description: "Returns all organizations the user is a member of",
        security: [{ bearerAuth: [] }],
      },
    }
  );
