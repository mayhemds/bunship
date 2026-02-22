/**
 * Role and permission middleware
 * Enforces RBAC on routes
 */
import { AuthorizationError } from "@bunship/utils";
import { hasPermission, type Permission, featuresConfig } from "@bunship/config";

type OrgRole = (typeof featuresConfig.organizations.roles)[number];

/**
 * Require specific role(s) to access a route
 */
export function requireRole(...roles: OrgRole[]) {
  return (ctx: any) => {
    const { membership, set } = ctx;

    if (!membership) {
      set.status = 401;
      throw new Error("Authentication required");
    }

    if (!roles.includes(membership.role as OrgRole)) {
      set.status = 403;
      throw new AuthorizationError("Insufficient role permissions");
    }
  };
}

/**
 * Require specific permission to access a route
 */
export function requirePermission(permission: Permission) {
  return (ctx: any) => {
    const { membership, set } = ctx;

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
  };
}

/**
 * Check if user is org owner
 */
export const requireOwner = requireRole("owner");

/**
 * Check if user is org admin or owner
 */
export const requireAdmin = requireRole("owner", "admin");
