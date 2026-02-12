/**
 * Audit logging service
 * Records all organization actions for compliance and debugging
 */
import { getDatabase } from "@bunship/database";
import { auditLogs, type ActorType, type NewAuditLog } from "@bunship/database/schema";
import { eq, and, desc, gte, lte, sql } from "drizzle-orm";
import { InternalError, NotFoundError } from "@bunship/utils";

/**
 * Filters for querying audit logs
 */
export interface AuditLogFilters {
  actorId?: string;
  actorType?: ActorType;
  action?: string;
  resourceType?: string;
  resourceId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

/**
 * Data for creating an audit log entry
 */
export interface LogAuditData {
  organizationId: string;
  actorId?: string;
  actorType: ActorType;
  actorEmail?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Audit logging service
 * Provides methods to log and query organization actions
 */
export const auditService = {
  /**
   * Create an audit log entry
   *
   * @param data - Audit log data
   * @returns Created audit log
   *
   * @example
   * ```typescript
   * await auditService.log({
   *   organizationId: "org_123",
   *   actorId: "user_123",
   *   actorType: "user",
   *   actorEmail: "user@example.com",
   *   action: "organization.updated",
   *   resourceType: "organization",
   *   resourceId: "org_123",
   *   oldValues: { name: "Old Name" },
   *   newValues: { name: "New Name" },
   *   ipAddress: "1.2.3.4",
   *   userAgent: "Mozilla/5.0 ...",
   * });
   * ```
   */
  async log(data: LogAuditData) {
    try {
      const db = getDatabase();

      const newLog: NewAuditLog = {
        organizationId: data.organizationId,
        actorId: data.actorId,
        actorType: data.actorType,
        actorEmail: data.actorEmail,
        action: data.action,
        resourceType: data.resourceType,
        resourceId: data.resourceId,
        oldValues: data.oldValues,
        newValues: data.newValues,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: data.metadata,
      };

      const [auditLog] = await db.insert(auditLogs).values(newLog).returning();

      return auditLog;
    } catch (error) {
      console.error("Failed to create audit log:", error);
      throw new InternalError("Failed to create audit log");
    }
  },

  /**
   * List audit logs for an organization with optional filters
   *
   * @param orgId - Organization ID
   * @param filters - Query filters
   * @returns Array of audit logs and total count
   *
   * @example
   * ```typescript
   * const { logs, total } = await auditService.list("org_123", {
   *   actorType: "user",
   *   action: "organization.updated",
   *   startDate: new Date("2024-01-01"),
   *   limit: 50,
   *   offset: 0,
   * });
   * ```
   */
  async list(orgId: string, filters: AuditLogFilters = {}) {
    try {
      const db = getDatabase();
      const limit = filters.limit ?? 50;
      const offset = filters.offset ?? 0;

      // Build WHERE conditions
      const conditions = [eq(auditLogs.organizationId, orgId)];

      if (filters.actorId) {
        conditions.push(eq(auditLogs.actorId, filters.actorId));
      }

      if (filters.actorType) {
        conditions.push(eq(auditLogs.actorType, filters.actorType));
      }

      if (filters.action) {
        conditions.push(eq(auditLogs.action, filters.action));
      }

      if (filters.resourceType) {
        conditions.push(eq(auditLogs.resourceType, filters.resourceType));
      }

      if (filters.resourceId) {
        conditions.push(eq(auditLogs.resourceId, filters.resourceId));
      }

      if (filters.startDate) {
        conditions.push(gte(auditLogs.createdAt, filters.startDate));
      }

      if (filters.endDate) {
        conditions.push(lte(auditLogs.createdAt, filters.endDate));
      }

      // Query logs and count in parallel
      const [logs, [{ count }]] = await Promise.all([
        db
          .select()
          .from(auditLogs)
          .where(and(...conditions))
          .orderBy(desc(auditLogs.createdAt))
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(auditLogs)
          .where(and(...conditions)),
      ]);

      return {
        logs,
        total: count,
        limit,
        offset,
      };
    } catch (error) {
      console.error("Failed to list audit logs:", error);
      throw new InternalError("Failed to list audit logs");
    }
  },

  /**
   * Get a single audit log by ID
   *
   * @param orgId - Organization ID
   * @param logId - Audit log ID
   * @returns Audit log
   * @throws NotFoundError if log not found or doesn't belong to organization
   *
   * @example
   * ```typescript
   * const log = await auditService.get("org_123", "log_123");
   * ```
   */
  async get(orgId: string, logId: string) {
    try {
      const db = getDatabase();

      const log = await db.query.auditLogs.findFirst({
        where: and(eq(auditLogs.id, logId), eq(auditLogs.organizationId, orgId)),
      });

      if (!log) {
        throw new NotFoundError("Audit log");
      }

      return log;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Failed to get audit log:", error);
      throw new InternalError("Failed to get audit log");
    }
  },

  /**
   * Helper to log user actions with common fields
   *
   * @param data - User action data
   * @returns Created audit log
   */
  async logUserAction(data: {
    organizationId: string;
    userId: string;
    userEmail: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    oldValues?: Record<string, unknown>;
    newValues?: Record<string, unknown>;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      organizationId: data.organizationId,
      actorId: data.userId,
      actorType: "user",
      actorEmail: data.userEmail,
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      oldValues: data.oldValues,
      newValues: data.newValues,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
    });
  },

  /**
   * Helper to log API key actions
   *
   * @param data - API key action data
   * @returns Created audit log
   */
  async logApiKeyAction(data: {
    organizationId: string;
    apiKeyId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    ipAddress?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      organizationId: data.organizationId,
      actorId: data.apiKeyId,
      actorType: "api_key",
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      ipAddress: data.ipAddress,
      metadata: data.metadata,
    });
  },

  /**
   * Helper to log system actions
   *
   * @param data - System action data
   * @returns Created audit log
   */
  async logSystemAction(data: {
    organizationId: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.log({
      organizationId: data.organizationId,
      actorType: "system",
      action: data.action,
      resourceType: data.resourceType,
      resourceId: data.resourceId,
      metadata: data.metadata,
    });
  },
};
