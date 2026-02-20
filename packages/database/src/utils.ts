import { sql, count } from "drizzle-orm";
import type { Database } from "./client";
import * as schema from "./schema";

/**
 * Database utility functions for common operations
 */

/**
 * Performs a health check on the database connection
 *
 * @param db - Database instance
 * @returns Promise that resolves to true if connection is healthy
 */
export async function healthCheck(db: Database): Promise<boolean> {
  try {
    await db.run(sql`SELECT 1`);
    return true;
  } catch (error) {
    console.error("Database health check failed:", error);
    return false;
  }
}

/**
 * Gets database statistics and metadata
 *
 * @param db - Database instance
 * @returns Database statistics
 */
export async function getDatabaseStats(db: Database) {
  const tableMap: Record<string, any> = {
    users: schema.users,
    organizations: schema.organizations,
    memberships: schema.memberships,
    invitations: schema.invitations,
    subscriptions: schema.subscriptions,
    sessions: schema.sessions,
    webhooks: schema.webhooks,
    webhookDeliveries: schema.webhookDeliveries,
    apiKeys: schema.apiKeys,
    auditLogs: schema.auditLogs,
    projects: schema.projects,
  };

  // Add optional tables if they exist in schema
  if (schema.files) {
    tableMap.files = schema.files;
  }
  if (schema.verificationTokens) {
    tableMap.verificationTokens = schema.verificationTokens;
  }

  const counts: Record<string, number> = {};
  for (const [name, table] of Object.entries(tableMap)) {
    try {
      const result = await db.select({ count: count() }).from(table);
      counts[name] = result[0]?.count ?? 0;
    } catch {
      counts[name] = -1; // Table may not exist yet
    }
  }

  return {
    healthy: true,
    tables: counts,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Cleans up expired sessions from the database
 *
 * @param db - Database instance
 * @returns Number of sessions deleted
 */
export async function cleanupExpiredSessions(db: Database): Promise<number> {
  const { sessions } = await import("./schema");
  const { sql, lt } = await import("drizzle-orm");

  const result = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });

  return result.length;
}

/**
 * Cleans up expired invitations from the database
 *
 * @param db - Database instance
 * @returns Number of invitations deleted
 */
export async function cleanupExpiredInvitations(db: Database): Promise<number> {
  const { invitations } = await import("./schema");
  const { lt, and, isNull } = await import("drizzle-orm");

  const result = await db
    .delete(invitations)
    .where(and(lt(invitations.expiresAt, new Date()), isNull(invitations.acceptedAt)))
    .returning({ id: invitations.id });

  return result.length;
}

/**
 * Gets pending webhook deliveries that need retry
 *
 * @param db - Database instance
 * @returns Array of webhook delivery IDs that need retry
 */
export async function getPendingWebhookRetries(db: Database) {
  const { webhookDeliveries } = await import("./schema");
  const { and, isNull, lte, lt } = await import("drizzle-orm");

  return await db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        isNull(webhookDeliveries.deliveredAt),
        lt(webhookDeliveries.attempts, 5),
        lte(webhookDeliveries.nextRetryAt, new Date())
      )
    )
    .limit(100);
}

/**
 * Validates organization slug format
 *
 * @param slug - Organization slug to validate
 * @returns True if valid
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 63;
}

/**
 * Generates a unique slug from a name
 *
 * @param name - Organization or project name
 * @returns URL-safe slug
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 63);
}

/**
 * Checks if a user has a specific role in an organization
 *
 * @param db - Database instance
 * @param userId - User ID
 * @param organizationId - Organization ID
 * @param requiredRole - Required role (owner, admin, member, viewer)
 * @returns True if user has the required role or higher
 */
export async function hasOrganizationRole(
  db: Database,
  userId: string,
  organizationId: string,
  requiredRole: "owner" | "admin" | "member" | "viewer"
): Promise<boolean> {
  const { memberships } = await import("./schema");
  const { eq, and } = await import("drizzle-orm");

  const roleHierarchy = {
    owner: 4,
    admin: 3,
    member: 2,
    viewer: 1,
  };

  const membership = await db.query.memberships.findFirst({
    where: and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId)),
  });

  if (!membership) {
    return false;
  }

  return roleHierarchy[membership.role] >= roleHierarchy[requiredRole];
}
