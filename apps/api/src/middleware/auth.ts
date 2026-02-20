/**
 * Authentication middleware
 * Validates JWT tokens and attaches user to context
 */
import { Elysia } from "elysia";
import { verifyAccessToken } from "../lib/jwt";
import { AuthenticationError } from "@bunship/utils";
import { getDatabase, users, eq } from "@bunship/database";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string | null;
  isActive: boolean;
  sessionId: string;
}

export const authMiddleware = new Elysia({ name: "auth" }).derive(
  { as: "scoped" },
  async ({ headers, set }): Promise<{ user: AuthUser }> => {
    const authorization = headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      set.status = 401;
      throw new AuthenticationError("Missing or invalid authorization header");
    }

    const token = authorization.slice(7);

    try {
      const payload = await verifyAccessToken(token);

      const db = getDatabase();
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!dbUser || !dbUser.isActive) {
        set.status = 401;
        throw new AuthenticationError("User not found or inactive");
      }

      const user: AuthUser = {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        isActive: dbUser.isActive,
        sessionId: payload.sessionId,
      };

      return { user };
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }
      set.status = 401;
      throw new AuthenticationError("Invalid or expired token");
    }
  }
);

/**
 * Optional auth - doesn't throw if no token, just sets user to null
 */
export const optionalAuthMiddleware = new Elysia({ name: "optionalAuth" }).derive(
  { as: "scoped" },
  async ({ headers }): Promise<{ user: AuthUser | null }> => {
    const authorization = headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return { user: null };
    }

    const token = authorization.slice(7);

    try {
      const payload = await verifyAccessToken(token);

      const db = getDatabase();
      const dbUser = await db.query.users.findFirst({
        where: eq(users.id, payload.userId),
      });

      if (!dbUser || !dbUser.isActive) {
        return { user: null };
      }

      const user: AuthUser = {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        isActive: dbUser.isActive,
        sessionId: payload.sessionId,
      };

      return { user };
    } catch {
      return { user: null };
    }
  }
);
