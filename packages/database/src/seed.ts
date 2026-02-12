/**
 * Database seed script
 * Creates demo data for development and testing
 */
import { createId } from "@paralleldrive/cuid2";
import { getDatabase } from "./client";
import {
  users,
  organizations,
  memberships,
  subscriptions,
  projects,
  auditLogs,
  apiKeys,
  webhooks,
  webhookDeliveries,
  files,
  type NewUser,
  type NewOrganization,
  type NewMembership,
  type NewSubscription,
  type NewProject,
  type NewAuditLog,
  type NewApiKey,
  type NewWebhook,
  type NewWebhookDelivery,
  type NewFile,
  eq,
} from "./index";

/**
 * Hash password helper (using Bun's built-in Argon2)
 */
async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password, {
    algorithm: "argon2id",
    memoryCost: 65536, // 64 MB
    timeCost: 3,
  });
}

/**
 * Create user helper with idempotency
 */
async function createUser(data: {
  email: string;
  password: string;
  fullName: string;
  emailVerified?: boolean;
  isAdmin?: boolean;
}) {
  const db = getDatabase();

  // Check if user already exists
  const existingUser = await db.query.users.findFirst({
    where: eq(users.email, data.email),
  });

  if (existingUser) {
    console.log(`  ✓ User ${data.email} already exists`);
    return existingUser;
  }

  const passwordHash = await hashPassword(data.password);

  const newUser: NewUser = {
    email: data.email,
    passwordHash,
    fullName: data.fullName,
    emailVerified: data.emailVerified ? new Date() : null,
    isAdmin: data.isAdmin || false,
    isActive: true,
  };

  const [user] = await db.insert(users).values(newUser).returning();

  console.log(`  ✓ Created user: ${data.email}`);
  return user!;
}

/**
 * Create organization helper with idempotency
 */
async function createOrganization(data: {
  name: string;
  slug: string;
  description?: string;
  createdBy: string;
}) {
  const db = getDatabase();

  // Check if organization already exists
  const existingOrg = await db.query.organizations.findFirst({
    where: eq(organizations.slug, data.slug),
  });

  if (existingOrg) {
    console.log(`  ✓ Organization ${data.slug} already exists`);
    return existingOrg;
  }

  const newOrg: NewOrganization = {
    name: data.name,
    slug: data.slug,
    description: data.description,
    createdBy: data.createdBy,
  };

  const [org] = await db.insert(organizations).values(newOrg).returning();

  console.log(`  ✓ Created organization: ${data.name}`);
  return org!;
}

/**
 * Create membership helper with idempotency
 */
async function createMembership(data: {
  userId: string;
  organizationId: string;
  role: "owner" | "admin" | "member" | "viewer";
}) {
  const db = getDatabase();

  // Check if membership already exists
  const existingMembership = await db.query.memberships.findFirst({
    where: (memberships, { and, eq }) =>
      and(eq(memberships.userId, data.userId), eq(memberships.organizationId, data.organizationId)),
  });

  if (existingMembership) {
    console.log(`  ✓ Membership already exists for user in organization`);
    return existingMembership;
  }

  const newMembership: NewMembership = {
    userId: data.userId,
    organizationId: data.organizationId,
    role: data.role,
  };

  const [membership] = await db.insert(memberships).values(newMembership).returning();

  console.log(`  ✓ Created membership: ${data.role}`);
  return membership;
}

/**
 * Create subscription helper with idempotency
 */
async function createSubscription(data: {
  organizationId: string;
  status: "trialing" | "active" | "canceled" | "past_due";
  planId: string;
  trialEnd?: Date;
}) {
  const db = getDatabase();

  // Check if subscription already exists
  const existingSub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.organizationId, data.organizationId),
  });

  if (existingSub) {
    console.log(`  ✓ Subscription already exists for organization`);
    return existingSub;
  }

  const newSub: NewSubscription = {
    organizationId: data.organizationId,
    stripeCustomerId: `cus_seed_${createId()}`,
    stripeSubscriptionId: data.status === "trialing" ? `sub_seed_${createId()}` : undefined,
    stripePriceId: `price_${data.planId}`,
    status: data.status,
    planId: data.planId,
    trialStart: data.status === "trialing" ? new Date() : undefined,
    trialEnd: data.trialEnd,
    currentPeriodStart: new Date(),
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  };

  const [subscription] = await db.insert(subscriptions).values(newSub).returning();

  console.log(`  ✓ Created subscription: ${data.status}`);
  return subscription;
}

/**
 * Create sample projects for an organization
 */
async function createProjects(organizationId: string, userId: string) {
  const db = getDatabase();

  const projectsData = [
    {
      name: "Sample Project Alpha",
      slug: "sample-alpha",
      description: "A demo project to showcase the platform capabilities",
      settings: {
        visibility: "private" as const,
        features: {
          api: true,
          webhooks: true,
          analytics: true,
        },
      },
    },
    {
      name: "Beta Testing",
      slug: "beta-testing",
      description: "Internal testing project for new features",
      settings: {
        visibility: "internal" as const,
        features: {
          api: true,
          webhooks: false,
          analytics: true,
        },
      },
    },
  ];

  for (const projectData of projectsData) {
    // Check if project already exists
    const existingProject = await db.query.projects.findFirst({
      where: (projects, { and, eq }) =>
        and(eq(projects.organizationId, organizationId), eq(projects.slug, projectData.slug)),
    });

    if (existingProject) {
      console.log(`  ✓ Project ${projectData.slug} already exists`);
      continue;
    }

    const newProject: NewProject = {
      organizationId,
      name: projectData.name,
      slug: projectData.slug,
      description: projectData.description,
      settings: projectData.settings,
      createdBy: userId,
    };

    await db.insert(projects).values(newProject);
    console.log(`  ✓ Created project: ${projectData.name}`);
  }
}

/**
 * Create audit log entries for an organization
 */
async function createAuditLogs(
  organizationId: string,
  teamMembers: { id: string; email: string }[],
) {
  const db = getDatabase();

  // Check if audit logs already exist for this org
  const existing = await db.query.auditLogs.findFirst({
    where: eq(auditLogs.organizationId, organizationId),
  });

  if (existing) {
    console.log(`  ✓ Audit logs already exist for organization`);
    return;
  }

  const owner = teamMembers[0];
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const entries: NewAuditLog[] = [
    {
      organizationId,
      actorId: owner.id,
      actorType: "user",
      actorEmail: owner.email,
      action: "organization.created",
      resourceType: "organization",
      resourceId: organizationId,
      createdAt: new Date(now - 14 * day),
    },
    {
      organizationId,
      actorId: owner.id,
      actorType: "user",
      actorEmail: owner.email,
      action: "billing.subscription.created",
      resourceType: "subscription",
      metadata: { plan: "pro", status: "trialing" },
      createdAt: new Date(now - 14 * day + 5 * 60 * 1000),
    },
  ];

  // Add member-related entries for each team member beyond the owner
  for (let i = 1; i < teamMembers.length; i++) {
    const member = teamMembers[i];
    const daysAgo = 12 - i * 2; // stagger join times

    entries.push({
      organizationId,
      actorId: owner.id,
      actorType: "user",
      actorEmail: owner.email,
      action: "member.invited",
      resourceType: "invitation",
      metadata: { email: member.email, role: i === 1 ? "admin" : "member" },
      createdAt: new Date(now - daysAgo * day),
    });

    entries.push({
      organizationId,
      actorId: member.id,
      actorType: "user",
      actorEmail: member.email,
      action: "member.joined",
      resourceType: "membership",
      createdAt: new Date(now - (daysAgo - 1) * day),
    });
  }

  // More recent activity
  const recentActors = teamMembers.length > 1 ? teamMembers : [owner];
  entries.push(
    {
      organizationId,
      actorId: owner.id,
      actorType: "user",
      actorEmail: owner.email,
      action: "api_key.created",
      resourceType: "api_key",
      metadata: { name: "Production API Key" },
      createdAt: new Date(now - 3 * day),
    },
    {
      organizationId,
      actorId: recentActors[recentActors.length > 1 ? 1 : 0].id,
      actorType: "user",
      actorEmail: recentActors[recentActors.length > 1 ? 1 : 0].email,
      action: "webhook.created",
      resourceType: "webhook",
      metadata: { url: "https://api.example.com/webhooks" },
      createdAt: new Date(now - 2 * day),
    },
    {
      organizationId,
      actorId: owner.id,
      actorType: "user",
      actorEmail: owner.email,
      action: "api_key.created",
      resourceType: "api_key",
      metadata: { name: "Staging API Key" },
      createdAt: new Date(now - 1 * day),
    },
    {
      organizationId,
      actorId: recentActors[recentActors.length > 2 ? 2 : 0].id,
      actorType: "user",
      actorEmail: recentActors[recentActors.length > 2 ? 2 : 0].email,
      action: "organization.settings.updated",
      resourceType: "organization",
      resourceId: organizationId,
      createdAt: new Date(now - 6 * hour),
    },
    {
      organizationId,
      actorId: owner.id,
      actorType: "user",
      actorEmail: owner.email,
      action: "webhook.tested",
      resourceType: "webhook",
      createdAt: new Date(now - 2 * hour),
    },
  );

  await db.insert(auditLogs).values(entries);
  console.log(`  ✓ Created ${entries.length} audit log entries`);
}

/**
 * Seed team members into an organization.
 * Also seeds audit logs and memberships for those members.
 */
async function seedTeamForOrg(
  orgId: string,
  teamUsers: { id: string; email: string }[],
  roles: ("admin" | "member" | "viewer")[],
) {
  for (let i = 0; i < teamUsers.length; i++) {
    await createMembership({
      userId: teamUsers[i].id,
      organizationId: orgId,
      role: roles[i] || "member",
    });
  }
}

/**
 * Create sample API keys for an organization
 */
async function createApiKeys(organizationId: string, createdBy: string) {
  const db = getDatabase();

  const existing = await db.query.apiKeys.findFirst({
    where: eq(apiKeys.organizationId, organizationId),
  });

  if (existing) {
    console.log(`  ✓ API keys already exist for organization`);
    return;
  }

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  // Use a pre-computed hash so the seed is deterministic (not a real secret)
  const fakeHash = await Bun.password.hash("seed-api-key-placeholder", {
    algorithm: "argon2id",
    memoryCost: 65536,
    timeCost: 3,
  });

  const keysData: NewApiKey[] = [
    {
      organizationId,
      name: "Production API Key",
      keyPrefix: "sk_live_",
      keyHash: `${fakeHash}_prod_${organizationId}`,
      scopes: ["read:users", "write:users", "read:orgs", "write:orgs", "read:billing", "read:files", "write:files"],
      rateLimit: 1000,
      lastUsedAt: new Date(now - 2 * hour),
      isActive: true,
      createdBy,
      createdAt: new Date(now - 10 * day),
    },
    {
      organizationId,
      name: "Staging API Key",
      keyPrefix: "sk_test_",
      keyHash: `${fakeHash}_staging_${organizationId}`,
      scopes: ["read:users", "read:orgs"],
      rateLimit: 500,
      lastUsedAt: new Date(now - 1 * day),
      isActive: true,
      createdBy,
      createdAt: new Date(now - 7 * day),
    },
    {
      organizationId,
      name: "Deprecated Key",
      keyPrefix: "sk_old_",
      keyHash: `${fakeHash}_old_${organizationId}`,
      scopes: ["read:users", "read:orgs", "read:billing"],
      rateLimit: 100,
      lastUsedAt: new Date(now - 30 * day),
      isActive: false,
      createdBy,
      createdAt: new Date(now - 60 * day),
    },
  ];

  await db.insert(apiKeys).values(keysData);
  console.log(`  ✓ Created ${keysData.length} API keys`);
}

/**
 * Create sample webhooks and deliveries for an organization
 */
async function createWebhooks(organizationId: string) {
  const db = getDatabase();

  const existing = await db.query.webhooks.findFirst({
    where: eq(webhooks.organizationId, organizationId),
  });

  if (existing) {
    console.log(`  ✓ Webhooks already exist for organization`);
    return;
  }

  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const day = 24 * hour;

  const webhooksData: NewWebhook[] = [
    {
      id: createId(),
      organizationId,
      url: "https://api.example.com/webhooks/bunship",
      description: "Production Notifications",
      secret: `whsec_seed_${createId()}`,
      events: ["member.joined", "member.removed", "api_key.created", "api_key.revoked", "file.uploaded", "billing.subscription.updated"],
      isActive: true,
      createdAt: new Date(now - 10 * day),
      updatedAt: new Date(now - 2 * day),
    },
    {
      id: createId(),
      organizationId,
      url: "https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX",
      description: "Slack Integration",
      secret: `whsec_seed_${createId()}`,
      events: ["member.joined", "member.removed"],
      isActive: true,
      createdAt: new Date(now - 5 * day),
      updatedAt: new Date(now - 5 * day),
    },
  ];

  await db.insert(webhooks).values(webhooksData);
  console.log(`  ✓ Created ${webhooksData.length} webhooks`);

  // Create deliveries for the first webhook
  const prodWebhookId = webhooksData[0].id!;
  const deliveriesData: NewWebhookDelivery[] = [
    {
      webhookId: prodWebhookId,
      event: "member.joined",
      payload: { event: "member.joined", data: { email: "alice@bunship.com", role: "admin" }, timestamp: new Date(now - 2 * day).toISOString() },
      response: '{"ok":true}',
      statusCode: 200,
      attempts: 1,
      deliveredAt: new Date(now - 2 * day),
      createdAt: new Date(now - 2 * day),
    },
    {
      webhookId: prodWebhookId,
      event: "api_key.created",
      payload: { event: "api_key.created", data: { name: "Production API Key" }, timestamp: new Date(now - 1 * day).toISOString() },
      response: '{"ok":true}',
      statusCode: 200,
      attempts: 1,
      deliveredAt: new Date(now - 1 * day),
      createdAt: new Date(now - 1 * day),
    },
    {
      webhookId: prodWebhookId,
      event: "file.uploaded",
      payload: { event: "file.uploaded", data: { name: "Q4-2025-Report.pdf", size: 2516582 }, timestamp: new Date(now - 12 * hour).toISOString() },
      response: '{"error":"Internal Server Error"}',
      statusCode: 500,
      attempts: 3,
      deliveredAt: null,
      nextRetryAt: new Date(now + 1 * hour),
      createdAt: new Date(now - 12 * hour),
    },
    {
      webhookId: prodWebhookId,
      event: "billing.subscription.updated",
      payload: { event: "billing.subscription.updated", data: { plan: "pro", status: "active" }, timestamp: new Date(now - 6 * hour).toISOString() },
      response: null,
      statusCode: 408,
      attempts: 2,
      deliveredAt: null,
      nextRetryAt: new Date(now + 30 * 60 * 1000),
      createdAt: new Date(now - 6 * hour),
    },
  ];

  await db.insert(webhookDeliveries).values(deliveriesData);
  console.log(`  ✓ Created ${deliveriesData.length} webhook deliveries`);
}

/**
 * Create sample files for an organization
 */
async function createFiles(organizationId: string, uploadedBy: string) {
  const db = getDatabase();

  const existing = await db.query.files.findFirst({
    where: eq(files.organizationId, organizationId),
  });

  if (existing) {
    console.log(`  ✓ Files already exist for organization`);
    return;
  }

  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const filesData: NewFile[] = [
    {
      organizationId,
      uploadedBy,
      name: "Q4-2025-Report.pdf",
      key: `orgs/${organizationId}/files/q4-2025-report.pdf`,
      bucket: "bunship-uploads",
      size: 2516582, // ~2.4 MB
      mimeType: "application/pdf",
      metadata: { description: "Quarterly business report", tags: ["reports", "finance"] },
      isPublic: false,
      createdAt: new Date(now - 5 * day),
      updatedAt: new Date(now - 5 * day),
    },
    {
      organizationId,
      uploadedBy,
      name: "team-photo.png",
      key: `orgs/${organizationId}/files/team-photo.png`,
      bucket: "bunship-uploads",
      size: 1153434, // ~1.1 MB
      mimeType: "image/png",
      metadata: { width: 1920, height: 1080, description: "Team offsite photo" },
      isPublic: true,
      createdAt: new Date(now - 3 * day),
      updatedAt: new Date(now - 3 * day),
    },
    {
      organizationId,
      uploadedBy,
      name: "onboarding-guide.docx",
      key: `orgs/${organizationId}/files/onboarding-guide.docx`,
      bucket: "bunship-uploads",
      size: 467968, // ~456 KB
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      metadata: { description: "New employee onboarding guide", tags: ["hr", "onboarding"] },
      isPublic: false,
      createdAt: new Date(now - 2 * day),
      updatedAt: new Date(now - 2 * day),
    },
    {
      organizationId,
      uploadedBy,
      name: "api-spec.json",
      key: `orgs/${organizationId}/files/api-spec.json`,
      bucket: "bunship-uploads",
      size: 23552, // ~23 KB
      mimeType: "application/json",
      metadata: { description: "OpenAPI specification v3.1", tags: ["api", "docs"] },
      isPublic: false,
      createdAt: new Date(now - 1 * day),
      updatedAt: new Date(now - 1 * day),
    },
    {
      organizationId,
      uploadedBy,
      name: "logo-dark.svg",
      key: `orgs/${organizationId}/files/logo-dark.svg`,
      bucket: "bunship-uploads",
      size: 8192, // ~8 KB
      mimeType: "image/svg+xml",
      metadata: { description: "Dark mode brand logo" },
      isPublic: true,
      createdAt: new Date(now - 12 * 60 * 60 * 1000),
      updatedAt: new Date(now - 12 * 60 * 60 * 1000),
    },
  ];

  await db.insert(files).values(filesData);
  console.log(`  ✓ Created ${filesData.length} files`);
}

/**
 * Populate ALL existing organizations with team members and audit logs.
 * This ensures manually-created orgs also have demo data.
 */
async function populateAllOrgs(teamUsers: { id: string; email: string }[]) {
  const db = getDatabase();
  const allOrgs = await db.query.organizations.findMany();

  for (const org of allOrgs) {
    console.log(`\n  Populating org: ${org.name} (${org.slug})`);

    // Find existing members
    const existingMembers = await db.query.memberships.findMany({
      where: eq(memberships.organizationId, org.id),
    });

    const existingUserIds = new Set(existingMembers.map((m) => m.userId));

    // Add team members that aren't already in this org
    const roles: ("admin" | "member" | "viewer")[] = ["admin", "member", "member", "viewer"];
    let added = 0;
    for (let i = 0; i < teamUsers.length; i++) {
      if (!existingUserIds.has(teamUsers[i].id)) {
        await createMembership({
          userId: teamUsers[i].id,
          organizationId: org.id,
          role: roles[i % roles.length],
        });
        added++;
      }
    }
    if (added === 0) {
      console.log(`  ✓ All team members already in org`);
    }

    // Build full member list for audit logs
    const allMembersNow = await db.query.memberships.findMany({
      where: eq(memberships.organizationId, org.id),
      with: { user: true },
    });

    const memberList = allMembersNow.map((m) => ({
      id: m.userId,
      email: m.user.email,
    }));

    await createAuditLogs(org.id, memberList);

    // Seed API keys, webhooks, and files
    const owner = memberList[0];
    await createApiKeys(org.id, owner.id);
    await createWebhooks(org.id);
    await createFiles(org.id, owner.id);
  }
}

/**
 * Main seed function
 */
async function seed() {
  console.log("🌱 Seeding database...\n");

  try {
    // ========== CREATE DEMO USER ==========
    console.log("📝 Creating demo user...");
    const demoUser = await createUser({
      email: "demo@bunship.com",
      password: "demo123456",
      fullName: "Demo User",
      emailVerified: true,
    });

    // ========== CREATE ADMIN USER ==========
    console.log("\n👑 Creating admin user...");
    const adminUser = await createUser({
      email: "admin@bunship.com",
      password: "admin123456",
      fullName: "Admin User",
      emailVerified: true,
      isAdmin: true,
    });

    // ========== CREATE TEAM MEMBERS ==========
    console.log("\n👥 Creating team members...");
    const alice = await createUser({
      email: "alice@bunship.com",
      password: "demo123456",
      fullName: "Alice Chen",
      emailVerified: true,
    });
    const bob = await createUser({
      email: "bob@bunship.com",
      password: "demo123456",
      fullName: "Bob Martinez",
      emailVerified: true,
    });
    const charlie = await createUser({
      email: "charlie@bunship.com",
      password: "demo123456",
      fullName: "Charlie Park",
      emailVerified: true,
    });
    const diana = await createUser({
      email: "diana@bunship.com",
      password: "demo123456",
      fullName: "Diana Ross",
      emailVerified: true,
    });

    const teamUsers = [
      { id: alice.id, email: alice.email },
      { id: bob.id, email: bob.email },
      { id: charlie.id, email: charlie.email },
      { id: diana.id, email: diana.email },
    ];

    // ========== CREATE DEMO ORGANIZATION ==========
    console.log("\n🏢 Creating demo organization...");
    const demoOrg = await createOrganization({
      name: "Demo Company",
      slug: "demo-company",
      description: "A sample organization for testing and demonstration",
      createdBy: demoUser.id,
    });

    // ========== CREATE MEMBERSHIP ==========
    console.log("\n🤝 Creating organization memberships...");
    await createMembership({
      userId: demoUser.id,
      organizationId: demoOrg.id,
      role: "owner",
    });
    await seedTeamForOrg(
      demoOrg.id,
      teamUsers,
      ["admin", "member", "member", "viewer"],
    );

    // ========== CREATE SUBSCRIPTION ==========
    console.log("\n💳 Creating trial subscription...");
    await createSubscription({
      organizationId: demoOrg.id,
      status: "trialing",
      planId: "pro",
      trialEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
    });

    // ========== CREATE SAMPLE PROJECTS ==========
    console.log("\n📦 Creating sample projects...");
    await createProjects(demoOrg.id, demoUser.id);

    // ========== CREATE ADMIN ORG ==========
    console.log("\n🏢 Creating admin organization...");
    const adminOrg = await createOrganization({
      name: "Admin Organization",
      slug: "admin-org",
      description: "Admin testing organization",
      createdBy: adminUser.id,
    });

    await createMembership({
      userId: adminUser.id,
      organizationId: adminOrg.id,
      role: "owner",
    });

    await createSubscription({
      organizationId: adminOrg.id,
      status: "active",
      planId: "enterprise",
    });

    // ========== POPULATE ALL ORGS (including manually created ones) ==========
    console.log("\n🔄 Populating all organizations with team members and audit logs...");
    await populateAllOrgs(teamUsers);

    // ========== SUCCESS ==========
    console.log("\n✅ Seed complete!\n");
    console.log("──────────────────────────────────────");
    console.log("Demo User:");
    console.log("  Email:    demo@bunship.com");
    console.log("  Password: demo123456");
    console.log("");
    console.log("Admin User:");
    console.log("  Email:    admin@bunship.com");
    console.log("  Password: admin123456");
    console.log("");
    console.log("Team Members:");
    console.log("  alice@bunship.com, bob@bunship.com,");
    console.log("  charlie@bunship.com, diana@bunship.com");
    console.log("  Password: demo123456 (all)");
    console.log("──────────────────────────────────────\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Seed failed:");
    console.error(error);
    process.exit(1);
  }
}

// Run seed if called directly
if (import.meta.main) {
  seed();
}

export { seed };
