/**
 * Audit Service Tests
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";

// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockInsertReturning = mock(() =>
  Promise.resolve([
    {
      id: "log-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorType: "user",
      actorEmail: "user@example.com",
      action: "organization.updated",
      resourceType: "organization",
      resourceId: "org-1",
      oldValues: { name: "Old Name" },
      newValues: { name: "New Name" },
      ipAddress: "192.168.1.1",
      userAgent: "TestAgent/1.0",
      metadata: null,
      createdAt: new Date("2025-06-01T12:00:00Z"),
    },
  ])
);
const mockInsertValues = mock(() => ({ returning: mockInsertReturning }));
const mockInsert = mock(() => ({ values: mockInsertValues }));

const mockSelectFrom = mock();
const mockSelectWhere = mock();
const mockSelectOrderBy = mock();
const mockSelectLimit = mock();
const mockSelectOffset = mock();

const mockCountResult = [{ count: 42 }];

// Chain: db.select().from().where().orderBy().limit().offset()
mockSelectOffset.mockImplementation(() =>
  Promise.resolve([
    {
      id: "log-1",
      organizationId: "org-1",
      actorId: "user-1",
      actorType: "user",
      action: "organization.updated",
      resourceType: "organization",
      createdAt: new Date("2025-06-01T12:00:00Z"),
    },
  ])
);
mockSelectLimit.mockImplementation(() => ({ offset: mockSelectOffset }));
mockSelectOrderBy.mockImplementation(() => ({ limit: mockSelectLimit }));
mockSelectWhere.mockImplementation(() => ({
  orderBy: mockSelectOrderBy,
}));
mockSelectFrom.mockImplementation(() => ({
  where: mockSelectWhere,
}));

const mockSelect = mock(() => ({ from: mockSelectFrom }));

// Count query chain: db.select({count}).from().where()
const mockCountSelect = mock();
const mockCountFrom = mock();
const mockCountWhere = mock(() => Promise.resolve(mockCountResult));

mockCountFrom.mockImplementation(() => ({ where: mockCountWhere }));
mockCountSelect.mockImplementation(() => ({ from: mockCountFrom }));

// Track which call to select is happening (first = data, second = count)
let selectCallCount = 0;

mockDatabase({
  getDatabase: () => ({
    insert: mockInsert,
    select: (...args: any[]) => {
      selectCallCount++;
      if (selectCallCount % 2 === 1) {
        return { from: mockSelectFrom };
      }
      return { from: mockCountFrom };
    },
    query: {
      auditLogs: {
        findFirst: mock(() => Promise.resolve(null)),
      },
    },
  }),
});

let auditService: typeof import("../../services/audit.service").auditService;

beforeAll(async () => {
  const mod = await import("../../services/audit.service");
  auditService = mod.auditService;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("audit.service", () => {
  beforeEach(() => {
    selectCallCount = 0;
    mockInsert.mockClear();
    mockInsertValues.mockClear();
    mockInsertReturning.mockClear();
    mockSelectWhere.mockClear();
    mockSelectLimit.mockClear();
    mockSelectOffset.mockClear();
    mockCountWhere.mockClear();
  });

  // ── log (createAuditLog) ──────────────────────────────────────────────
  describe("log", () => {
    it("inserts the correct audit data", async () => {
      const data = {
        organizationId: "org-1",
        actorId: "user-1",
        actorType: "user" as const,
        actorEmail: "user@example.com",
        action: "organization.updated",
        resourceType: "organization",
        resourceId: "org-1",
        oldValues: { name: "Old Name" },
        newValues: { name: "New Name" },
        ipAddress: "192.168.1.1",
        userAgent: "TestAgent/1.0",
      };

      const result = await auditService.log(data);

      expect(mockInsert).toHaveBeenCalled();
      expect(mockInsertValues).toHaveBeenCalled();

      const insertedData = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
      expect(insertedData.organizationId).toBe("org-1");
      expect(insertedData.actorId).toBe("user-1");
      expect(insertedData.actorType).toBe("user");
      expect(insertedData.action).toBe("organization.updated");
      expect(insertedData.resourceType).toBe("organization");
      expect(insertedData.resourceId).toBe("org-1");
      expect(insertedData.oldValues).toEqual({ name: "Old Name" });
      expect(insertedData.newValues).toEqual({ name: "New Name" });
      expect(insertedData.ipAddress).toBe("192.168.1.1");
    });

    it("returns the created audit log record", async () => {
      const result = await auditService.log({
        organizationId: "org-1",
        actorType: "system",
        action: "system.check",
        resourceType: "system",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("log-1");
      expect(result.organizationId).toBe("org-1");
    });

    it("handles optional fields as undefined", async () => {
      await auditService.log({
        organizationId: "org-1",
        actorType: "system",
        action: "system.health",
        resourceType: "health",
      });

      const insertedData = mockInsertValues.mock.calls[0][0] as Record<string, unknown>;
      expect(insertedData.actorId).toBeUndefined();
      expect(insertedData.actorEmail).toBeUndefined();
      expect(insertedData.resourceId).toBeUndefined();
      expect(insertedData.oldValues).toBeUndefined();
      expect(insertedData.newValues).toBeUndefined();
    });
  });

  // ── list (queryAuditLogs) ─────────────────────────────────────────────
  describe("list", () => {
    it("filters by organization ID", async () => {
      await auditService.list("org-1");

      expect(mockSelectWhere).toHaveBeenCalled();
      // The where clause should include the org filter
      const whereArgs = mockSelectWhere.mock.calls[0][0] as any[];
      // Should contain at least the org eq condition
      expect(whereArgs).toBeDefined();
    });

    it("applies actorId filter when provided", async () => {
      await auditService.list("org-1", { actorId: "user-42" });

      expect(mockSelectWhere).toHaveBeenCalled();
    });

    it("applies action filter when provided", async () => {
      await auditService.list("org-1", { action: "organization.updated" });

      expect(mockSelectWhere).toHaveBeenCalled();
    });

    it("applies date range filters when provided", async () => {
      await auditService.list("org-1", {
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
      });

      expect(mockSelectWhere).toHaveBeenCalled();
    });

    it("uses default pagination (limit=50, offset=0)", async () => {
      await auditService.list("org-1");

      expect(mockSelectLimit).toHaveBeenCalledWith(50);
      expect(mockSelectOffset).toHaveBeenCalledWith(0);
    });

    it("uses custom pagination values", async () => {
      await auditService.list("org-1", { limit: 25, offset: 50 });

      expect(mockSelectLimit).toHaveBeenCalledWith(25);
      expect(mockSelectOffset).toHaveBeenCalledWith(50);
    });

    it("returns logs and total count", async () => {
      const result = await auditService.list("org-1");

      expect(result).toHaveProperty("logs");
      expect(result).toHaveProperty("total");
      expect(result).toHaveProperty("limit");
      expect(result).toHaveProperty("offset");
      expect(result.total).toBe(42);
      expect(Array.isArray(result.logs)).toBe(true);
    });
  });
});
