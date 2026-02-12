/**
 * Role and permission middleware
 * Enforces RBAC on routes
 */
import { Elysia } from "elysia";
import { AuthorizationError } from "@bunship/utils";
import { hasPermission, type Permission, featuresConfig } from "@bunship/config";
import type { Membership } from "./organization";

type OrgRole = (typeof featuresConfig.organizations.roles)[number];

/**
 * Require specific role(s) to access a route
 */
export function requireRole(...roles: OrgRole[]) {
  return new Elysia({ name: `role:${roles.join(",")}` }).derive(({ store, set }) => {
    const membership = (store as { membership?: Membership }).membership;

    if (!membership) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    if (!roles.includes(membership.role as OrgRole)) {
      set.status = 403;
      throw new AuthorizationError("Insufficient role permissions");
    }

    return {};
  });
}

/**
 * Require specific permission to access a route
 */
export function requirePermission(permission: Permission) {
  return new Elysia({ name: `permission:${permission}` }).derive(({ store, set }) => {
    const membership = (store as { membership?: Membership }).membership;

    if (!membership) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    const rolePermissions =
      featuresConfig.organizations.permissions[
        membership.role as keyof typeof featuresConfig.organizations.permissions
      ] || [];

    if (!hasPermission(rolePermissions, permission)) {
      set.status = 403;
      throw new AuthorizationError(`Missing permission: ${permission}`);
    }

    return {};
  });
}

/**
 * Check if user is org owner
 */
export const requireOwner = requireRole("owner");

/**
 * Check if user is org admin or owner
 */
export const requireAdmin = requireRole("owner", "admin");
