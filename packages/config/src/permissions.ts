/**
 * Permission definitions and utilities
 * Role-based access control
 */
export const permissions = {
  "org:read": "View organization details",
  "org:update": "Update organization settings",
  "org:delete": "Delete organization",
  "org:transfer": "Transfer organization ownership",
  "members:read": "View team members",
  "members:invite": "Invite new members",
  "members:update": "Update member roles",
  "members:remove": "Remove members",
  "members:*": "Full member management",
  "invitations:read": "View pending invitations",
  "invitations:create": "Send invitations",
  "invitations:delete": "Cancel invitations",
  "invitations:*": "Full invitation management",
  "projects:read": "View projects",
  "projects:create": "Create projects",
  "projects:update": "Update projects",
  "projects:delete": "Delete projects",
  "projects:*": "Full project management",
  "webhooks:read": "View webhook endpoints",
  "webhooks:create": "Create webhook endpoints",
  "webhooks:update": "Update webhook endpoints",
  "webhooks:delete": "Delete webhook endpoints",
  "webhooks:*": "Full webhook management",
  "api-keys:read": "View API keys",
  "api-keys:create": "Create API keys",
  "api-keys:delete": "Delete API keys",
  "api-keys:*": "Full API key management",
  "billing:read": "View billing information",
  "billing:manage": "Manage subscription",
  "billing:*": "Full billing management",
  "files:read": "View and download files",
  "files:upload": "Upload files",
  "files:delete": "Delete files",
  "files:*": "Full file management",
  "audit-logs:read": "View audit logs",
  "admin:*": "Full admin access",
} as const;

export type Permission = keyof typeof permissions;

/**
 * Check if a user has a specific permission based on their permissions list
 */
export function hasPermission(
  userPermissions: readonly string[],
  requiredPermission: Permission
): boolean {
  // Wildcard grants all permissions
  if (userPermissions.includes("*")) return true;

  // Direct permission match
  if (userPermissions.includes(requiredPermission)) return true;

  // Category wildcard match (e.g., "members:*" grants "members:read")
  const [category] = requiredPermission.split(":");
  if (category && userPermissions.includes(`${category}:*`)) return true;

  return false;
}

/**
 * Check if a user has all required permissions
 */
export function hasAllPermissions(
  userPermissions: readonly string[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.every((perm) => hasPermission(userPermissions, perm));
}

/**
 * Check if a user has any of the required permissions
 */
export function hasAnyPermission(
  userPermissions: readonly string[],
  requiredPermissions: Permission[]
): boolean {
  return requiredPermissions.some((perm) => hasPermission(userPermissions, perm));
}

/**
 * Get all permissions for a category
 */
export function getCategoryPermissions(category: string): Permission[] {
  return Object.keys(permissions).filter((p) => p.startsWith(`${category}:`)) as Permission[];
}
