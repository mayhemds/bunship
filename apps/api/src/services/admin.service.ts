/**
 * Admin service
 * Business logic for admin operations
 */
import {
  getDatabase,
  users,
  organizations,
  memberships,
  subscriptions,
  sessions,
  projects,
  eq,
  and,
  isNull,
  sql,
  type User,
  type Organization,
} from "@bunship/database";
import { ValidationError, NotFoundError, AuthorizationError } from "@bunship/utils";
import { signAccessToken } from "../lib/jwt";
import { generateToken, hashToken } from "../lib/crypto";

export interface ListUsersFilters {
  email?: string;
  isActive?: boolean;
  isAdmin?: boolean;
  search?: string;
}

export interface Pagination {
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ListOrganizationsFilters {
  search?: string;
  hasSubscription?: boolean;
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    admins: number;
    newThisMonth: number;
  };
  organizations: {
    total: number;
    withActiveSubscriptions: number;
    onTrial: number;
    newThisMonth: number;
  };
  projects: {
    total: number;
    activeThisMonth: number;
  };
}

/**
 * List users with filters and pagination
 */
export async function listUsers(
  filters: ListUsersFilters = {},
  pagination: Pagination = {}
): Promise<PaginatedResponse<User>> {
  const db = getDatabase();
  const page = pagination.page ?? 1;
  const limit = Math.min(pagination.limit ?? 50, 100); // Max 100 per page
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [isNull(users.deletedAt)];

  if (filters.email) {
    conditions.push(eq(users.email, filters.email));
  }

  if (filters.isActive !== undefined) {
    conditions.push(eq(users.isActive, filters.isActive));
  }

  if (filters.isAdmin !== undefined) {
    conditions.push(eq(users.isAdmin, filters.isAdmin));
  }

  if (filters.search) {
    const escapedSearch = filters.search.replace(/[%_\\]/g, "\\$&");
    conditions.push(
      sql`(${users.email} LIKE ${"%" + escapedSearch + "%"} OR ${users.fullName} LIKE ${"%" + escapedSearch + "%"})`
    );
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Get count and paginated results in parallel
  const [countRows, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause),
    db.query.users.findMany({
      where: whereClause,
      limit,
      offset,
      orderBy: (users, { desc }) => [desc(users.createdAt)],
      columns: {
        passwordHash: false,
        twoFactorSecret: false,
      },
    }),
  ]);
  const count = countRows[0]?.count ?? 0;

  return {
    data: data as User[],
    pagination: {
      page,
      limit,
      total: count,
      totalPages: Math.ceil(count / limit),
    },
  };
}

/**
 * Create a new user (admin only)
 */
export async function createUser(data: {
  email: string;
  password: string;
  fullName?: string;
  isAdmin?: boolean;
}): Promise<User> {
  const db = getDatabase();

  const existing = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });
  if (existing) {
    throw new ValidationError("A user with this email already exists");
  }

  const passwordHash = await Bun.password.hash(data.password, {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });

  const [user] = await db
    .insert(users)
    .values({
      email: data.email,
      passwordHash,
      fullName: data.fullName || null,
      isAdmin: data.isAdmin || false,
      isActive: true,
      emailVerified: new Date(),
    })
    .returning();

  if (!user) {
    throw new Error("Failed to create user");
  }

  const { passwordHash: _, twoFactorSecret: __, ...safeUser } = user;
  return safeUser as User;
}

/**
 * Get user details by ID
 */
export async function getUser(userId: string): Promise<User> {
  const db = getDatabase();

  const user = await db.query.users.findFirst({
    where: and(eq(users.id, userId), isNull(users.deletedAt)),
    columns: {
      passwordHash: false,
      twoFactorSecret: false,
    },
  });

  if (!user) {
    throw new NotFoundError("User not found");
  }

  return user as User;
}

/**
 * Update user details
 */
export async function updateUser(
  userId: string,
  data: Partial<Pick<User, "fullName" | "avatarUrl" | "isActive" | "isAdmin" | "emailVerified">>
): Promise<User> {
  const db = getDatabase();

  // Verify user exists
  await getUser(userId);

  // Update user
  const updated = await db
    .update(users)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId))
    .returning();

  if (!updated[0]) {
    throw new NotFoundError("User not found");
  }

  // Return updated user without sensitive fields
  const { passwordHash, twoFactorSecret, ...safeUser } = updated[0];
  return safeUser as User;
}

/**
 * Soft delete user
 */
export async function deleteUser(userId: string): Promise<void> {
  const db = getDatabase();

  // Verify user exists and is not an admin
  const user = await getUser(userId);

  if (user.isAdmin) {
    throw new ValidationError("Cannot delete admin users");
  }

  // Soft delete
  await db
    .update(users)
    .set({
      deletedAt: new Date(),
      isActive: false,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

/**
 * Generate impersonation token for user
 */
export async function impersonateUser(
  userId: string,
  adminUser: { id: string; email: string }
): Promise<{ token: string; user: User }> {
  const db = getDatabase();

  const user = await getUser(userId);

  if (!user.isActive) {
    throw new ValidationError("Cannot impersonate inactive user");
  }

  // Prevent impersonation of other admin accounts
  if (user.isAdmin) {
    throw new AuthorizationError("Cannot impersonate admin users");
  }

  // Create a real session for impersonation (auditable and revocable)
  const refreshTokenRaw = generateToken(32);
  const refreshTokenHash = await hashToken(refreshTokenRaw);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour for impersonation

  const [session] = await db
    .insert(sessions)
    .values({
      userId: user.id,
      refreshTokenHash,
      userAgent: `admin-impersonation:${adminUser.id}`,
      ipAddress: null,
      expiresAt,
    })
    .returning();

  const token = await signAccessToken({
    userId: user.id,
    email: user.email,
    sessionId: session!.id,
  });

  // Audit log: record who impersonated whom
  console.log(
    `[AUDIT] Admin ${adminUser.email} (${adminUser.id}) impersonated user ${user.email} (${user.id}) at ${new Date().toISOString()}`
  );

  return { token, user };
}

/**
 * List organizations with filters and pagination
 */
export async function listOrganizations(
  filters: ListOrganizationsFilters = {},
  pagination: Pagination = {}
): Promise<PaginatedResponse<Organization & { subscriptionStatus?: string }>> {
  const db = getDatabase();
  const page = pagination.page ?? 1;
  const limit = Math.min(pagination.limit ?? 50, 100);
  const offset = (page - 1) * limit;

  // Build where conditions
  const conditions = [isNull(organizations.deletedAt)];

  if (filters.search) {
    const escapedSearch = filters.search.replace(/[%_\\]/g, "\\$&");
    conditions.push(
      sql`(${organizations.name} LIKE ${"%" + escapedSearch + "%"} OR ${organizations.slug} LIKE ${"%" + escapedSearch + "%"})`
    );
  }

  const whereClause = conditions.length > 1 ? and(...conditions) : conditions[0];

  // Get count and paginated results in parallel
  const [countRows2, data] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(whereClause),
    db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        description: organizations.description,
        logoUrl: organizations.logoUrl,
        settings: organizations.settings,
        createdBy: organizations.createdBy,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        deletedAt: organizations.deletedAt,
        subscriptionStatus: subscriptions.status,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(sql`${organizations.createdAt} DESC`),
  ]);
  const count2 = countRows2[0]?.count ?? 0;

  // Filter by subscription status if needed
  let filteredData = data;
  if (filters.hasSubscription !== undefined) {
    filteredData = data.filter((org) =>
      filters.hasSubscription ? org.subscriptionStatus !== null : org.subscriptionStatus === null
    );
  }

  return {
    data: filteredData as (Organization & { subscriptionStatus?: string })[],
    pagination: {
      page,
      limit,
      total: count2,
      totalPages: Math.ceil(count2 / limit),
    },
  };
}

/**
 * Get organization details by ID
 */
export async function getOrganization(organizationId: string): Promise<Organization> {
  const db = getDatabase();

  const organization = await db.query.organizations.findFirst({
    where: and(eq(organizations.id, organizationId), isNull(organizations.deletedAt)),
  });

  if (!organization) {
    throw new NotFoundError("Organization not found");
  }

  return organization;
}

/**
 * Get system statistics
 */
export async function getSystemStats(): Promise<SystemStats> {
  const db = getDatabase();

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // All stats queries in parallel
  const [userRows, orgRows, subRows, projectRows] = await Promise.all([
    db
      .select({
        total: sql<number>`count(*)`,
        active: sql<number>`sum(case when ${users.isActive} = 1 then 1 else 0 end)`,
        admins: sql<number>`sum(case when ${users.isAdmin} = 1 then 1 else 0 end)`,
        newThisMonth: sql<number>`sum(case when ${users.createdAt} >= ${startOfMonth} then 1 else 0 end)`,
      })
      .from(users)
      .where(isNull(users.deletedAt)),
    db
      .select({
        total: sql<number>`count(*)`,
        newThisMonth: sql<number>`sum(case when ${organizations.createdAt} >= ${startOfMonth} then 1 else 0 end)`,
      })
      .from(organizations)
      .where(isNull(organizations.deletedAt)),
    db
      .select({
        withActiveSubscriptions: sql<number>`sum(case when ${subscriptions.status} = 'active' then 1 else 0 end)`,
        onTrial: sql<number>`sum(case when ${subscriptions.status} = 'trialing' then 1 else 0 end)`,
      })
      .from(subscriptions),
    db
      .select({
        total: sql<number>`count(*)`,
        activeThisMonth: sql<number>`sum(case when ${projects.updatedAt} >= ${startOfMonth} then 1 else 0 end)`,
      })
      .from(projects)
      .where(isNull(projects.deletedAt)),
  ]);
  const userStats = userRows[0]!;
  const orgStats = orgRows[0]!;
  const subStats = subRows[0]!;
  const projectStats = projectRows[0]!;

  return {
    users: {
      total: userStats.total || 0,
      active: userStats.active || 0,
      admins: userStats.admins || 0,
      newThisMonth: userStats.newThisMonth || 0,
    },
    organizations: {
      total: orgStats.total || 0,
      withActiveSubscriptions: subStats.withActiveSubscriptions || 0,
      onTrial: subStats.onTrial || 0,
      newThisMonth: orgStats.newThisMonth || 0,
    },
    projects: {
      total: projectStats.total || 0,
      activeThisMonth: projectStats.activeThisMonth || 0,
    },
  };
}

/**
 * Set maintenance mode (stored in a simple key-value table or Redis)
 * For now, we'll use an environment variable approach
 */
export async function setMaintenanceMode(enabled: boolean): Promise<{ enabled: boolean }> {
  // TODO: Implement persistence (Redis or database table)
  // For now, this is a placeholder
  // In production, you'd want to store this in Redis or a settings table

  console.log(`Maintenance mode ${enabled ? "enabled" : "disabled"}`);

  return { enabled };
}

/**
 * Get maintenance mode status
 */
export async function getMaintenanceMode(): Promise<{ enabled: boolean }> {
  // TODO: Implement persistence
  // Check environment variable or Redis/database
  const enabled = process.env.MAINTENANCE_MODE === "true";

  return { enabled };
}
