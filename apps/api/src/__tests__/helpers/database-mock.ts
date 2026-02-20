/**
 * Shared comprehensive @bunship/database mock
 *
 * Every test that mocks @bunship/database MUST use this helper to ensure all
 * exports are present. Bun's mock.module leaks across test files in the same
 * process, so partial mocks break other tests that import the real module.
 */
import { mock } from "bun:test";

/** Stub table object — each column exported as a string placeholder */
function stubTable(columns: string[]): Record<string, string> {
  const obj: Record<string, string> = {};
  for (const col of columns) obj[col] = col;
  return obj;
}

/** No-op mock function */
const noop = mock(() => {});
const noopPromise = mock(() => Promise.resolve(null));
const noopArr = mock(() => Promise.resolve([]));

/** Default table column stubs */
const tables = {
  users: stubTable([
    "id",
    "email",
    "passwordHash",
    "fullName",
    "isActive",
    "emailVerified",
    "twoFactorEnabled",
    "twoFactorSecret",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  sessions: stubTable([
    "id",
    "userId",
    "token",
    "expiresAt",
    "createdAt",
    "lastActiveAt",
    "ipAddress",
    "userAgent",
  ]),
  organizations: stubTable([
    "id",
    "name",
    "slug",
    "ownerId",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  memberships: stubTable(["id", "userId", "organizationId", "role", "createdAt", "updatedAt"]),
  invitations: stubTable([
    "id",
    "email",
    "organizationId",
    "role",
    "invitedBy",
    "token",
    "expiresAt",
    "acceptedAt",
    "createdAt",
  ]),
  projects: stubTable([
    "id",
    "organizationId",
    "name",
    "slug",
    "description",
    "createdAt",
    "updatedAt",
    "deletedAt",
  ]),
  apiKeys: stubTable([
    "id",
    "organizationId",
    "name",
    "keyPrefix",
    "keyHash",
    "scopes",
    "rateLimit",
    "expiresAt",
    "isActive",
    "createdBy",
    "lastUsedAt",
    "createdAt",
  ]),
  webhooks: stubTable([
    "id",
    "organizationId",
    "url",
    "description",
    "secret",
    "events",
    "isActive",
    "createdAt",
    "updatedAt",
  ]),
  webhookDeliveries: stubTable([
    "id",
    "webhookId",
    "event",
    "payload",
    "statusCode",
    "response",
    "attempts",
    "deliveredAt",
    "nextRetryAt",
    "createdAt",
  ]),
  subscriptions: stubTable([
    "id",
    "organizationId",
    "stripeCustomerId",
    "stripeSubscriptionId",
    "planId",
    "status",
    "currentPeriodStart",
    "currentPeriodEnd",
    "cancelAt",
    "createdAt",
    "updatedAt",
  ]),
  auditLogs: stubTable([
    "id",
    "organizationId",
    "actorId",
    "actorType",
    "actorEmail",
    "action",
    "resourceType",
    "resourceId",
    "oldValues",
    "newValues",
    "ipAddress",
    "userAgent",
    "metadata",
    "createdAt",
  ]),
  files: stubTable([
    "id",
    "organizationId",
    "uploadedBy",
    "name",
    "key",
    "bucket",
    "size",
    "mimeType",
    "metadata",
    "isPublic",
    "expiresAt",
    "deletedAt",
    "createdAt",
    "updatedAt",
  ]),
  verificationTokens: stubTable(["id", "userId", "type", "token", "expiresAt", "createdAt"]),
  backupCodes: stubTable(["id", "userId", "code", "usedAt", "createdAt"]),
};

/** Relation stubs */
const relations = {
  usersRelations: {},
  sessionsRelations: {},
  organizationsRelations: {},
  membershipsRelations: {},
  invitationsRelations: {},
  projectsRelations: {},
  apiKeysRelations: {},
  webhooksRelations: {},
  webhookDeliveriesRelations: {},
  subscriptionsRelations: {},
  auditLogsRelations: {},
  filesRelations: {},
  verificationTokensRelations: {},
  backupCodesRelations: {},
};

/** Query operator stubs */
const operators = {
  eq: (a: unknown, b: unknown) => ({ op: "eq", field: a, value: b }),
  ne: (a: unknown, b: unknown) => ({ op: "ne", field: a, value: b }),
  gt: (a: unknown, b: unknown) => ({ op: "gt", field: a, value: b }),
  gte: (a: unknown, b: unknown) => ({ op: "gte", field: a, value: b }),
  lt: (a: unknown, b: unknown) => ({ op: "lt", field: a, value: b }),
  lte: (a: unknown, b: unknown) => ({ op: "lte", field: a, value: b }),
  like: (a: unknown, b: unknown) => ({ op: "like", field: a, value: b }),
  and: (...args: unknown[]) => args.filter(Boolean),
  or: (...args: unknown[]) => args,
  not: (a: unknown) => ({ not: a }),
  isNull: (a: unknown) => ({ isNull: a }),
  isNotNull: (a: unknown) => ({ isNotNull: a }),
  asc: (a: unknown) => ({ asc: a }),
  desc: (a: unknown) => ({ desc: a }),
  sql: (strings: TemplateStringsArray, ...values: unknown[]) => ({ sql: strings, values }),
};

/** Utility function stubs */
const utilFns = {
  createDatabase: noop,
  generateSlug: mock(() => "test-slug"),
  getDatabaseStats: noopPromise,
  getPendingWebhookRetries: noopArr,
  healthCheck: mock(() => Promise.resolve(true)),
  cleanupExpiredInvitations: noopPromise,
  cleanupExpiredSessions: noopPromise,
  resetDatabase: noopPromise,
  hasOrganizationRole: mock(() => false),
  isValidSlug: mock(() => true),
};

export interface DatabaseMockConfig {
  /** Override getDatabase to return a custom mock */
  getDatabase?: () => Record<string, any>;
}

/**
 * Register a comprehensive @bunship/database mock.
 * Call this BEFORE any import of modules that use @bunship/database.
 */
export function mockDatabase(config?: DatabaseMockConfig) {
  const defaultDb = {
    insert: mock(() => ({ values: mock(() => ({ returning: mock(() => Promise.resolve([])) })) })),
    update: mock(() => ({
      set: mock(() => ({ where: mock(() => ({ returning: mock(() => Promise.resolve([])) })) })),
    })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => ({
            limit: mock(() => ({ offset: mock(() => Promise.resolve([])) })),
          })),
        })),
      })),
    })),
    query: {
      users: { findFirst: noopPromise, findMany: noopArr },
      sessions: { findFirst: noopPromise, findMany: noopArr },
      organizations: { findFirst: noopPromise, findMany: noopArr },
      memberships: { findFirst: noopPromise, findMany: noopArr },
      invitations: { findFirst: noopPromise, findMany: noopArr },
      projects: { findFirst: noopPromise, findMany: noopArr },
      apiKeys: { findFirst: noopPromise, findMany: noopArr },
      webhooks: { findFirst: noopPromise, findMany: noopArr },
      webhookDeliveries: { findFirst: noopPromise, findMany: noopArr },
      subscriptions: { findFirst: noopPromise, findMany: noopArr },
      auditLogs: { findFirst: noopPromise, findMany: noopArr },
      files: { findFirst: noopPromise, findMany: noopArr },
      verificationTokens: { findFirst: noopPromise, findMany: noopArr },
      backupCodes: { findFirst: noopPromise, findMany: noopArr },
    },
    execute: mock(() => Promise.resolve({ rows: [] })),
  };

  const getDatabase = config?.getDatabase ?? (() => defaultDb);

  mock.module("@bunship/database", () => ({
    getDatabase,
    ...tables,
    ...relations,
    ...operators,
    ...utilFns,
  }));

  return { tables, operators, defaultDb };
}
