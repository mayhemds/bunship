/**
 * Admin authentication middleware
 * Verifies that the authenticated user has admin privileges
 */
import { Elysia } from "elysia";
import { AuthorizationError } from "@bunship/utils";
import { getDatabase, users, eq } from "@bunship/database";
import type { AuthUser } from "./auth";

/**
 * Admin middleware - checks if user has admin flag
 * Must be used after authMiddleware
 */
export const adminMiddleware = new Elysia({ name: "admin" }).derive(
  { as: "scoped" },
  async ({ user, set }): Promise<{ isAdmin: true }> => {
    const authUser = user as AuthUser;

    if (!authUser) {
      set.status = 401;
      throw new AuthorizationError("Authentication required");
    }

    const db = getDatabase();

    // Check if user is admin in database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, authUser.id),
      columns: {
        id: true,
        isAdmin: true,
        isActive: true,
      },
    });

    if (!dbUser || !dbUser.isActive) {
      set.status = 401;
      throw new AuthorizationError("User not found or inactive");
    }

    if (!dbUser.isAdmin) {
      set.status = 403;
      throw new AuthorizationError("Admin access required");
    }

    return { isAdmin: true };
  }
);
