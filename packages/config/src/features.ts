/**
 * Feature configuration
 * Toggle features and customize behavior
 */
export const featuresConfig = {
  auth: {
    enableEmailPassword: true,
    enableMagicLink: true,
    enableGoogleOAuth: true,
    enableGithubOAuth: true,
    enableTwoFactor: true,
    enableSessionManagement: true,
    requireEmailVerification: true,
    password: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: false,
    },
    lockout: {
      enabled: true,
      maxAttempts: 5,
      lockoutDuration: 15 * 60, // 15 minutes in seconds
    },
    maxSessionsPerUser: 5,
  },

  organizations: {
    enabled: true,
    allowMultipleOrgs: true,
    allowOrgCreation: true,
    requireOrgOnSignup: false,
    maxOrgsPerUser: 10,
    roles: ["owner", "admin", "member", "viewer"] as const,
    defaultRole: "member" as const,
    permissions: {
      owner: ["*"],
      admin: [
        "org:read",
        "org:update",
        "members:*",
        "invitations:*",
        "projects:*",
        "webhooks:*",
        "api-keys:*",
        "billing:read",
        "files:*",
        "audit-logs:read",
      ],
      member: ["org:read", "members:read", "projects:*", "files:read", "files:upload"],
      viewer: ["org:read", "members:read", "projects:read", "files:read"],
    },
  },

  billing: {
    enabled: true,
    provider: "stripe" as const,
    trialDays: 14,
    allowFreePlan: true,
    requirePaymentMethod: false,
  },

  webhooks: {
    enabled: true,
    maxEndpointsPerOrg: 10,
    maxRetries: 5,
    retryDelays: [60, 300, 1800, 7200, 86400], // seconds
    timeout: 10000,
    events: [
      "organization.created",
      "organization.updated",
      "organization.deleted",
      "member.invited",
      "member.joined",
      "member.updated",
      "member.removed",
      "subscription.created",
      "subscription.updated",
      "subscription.canceled",
      "invoice.paid",
      "invoice.failed",
      "project.created",
      "project.updated",
      "project.deleted",
    ] as const,
  },

  apiKeys: {
    enabled: true,
    maxKeysPerOrg: 10,
    defaultRateLimit: 1000,
    scopes: [
      "read:projects",
      "write:projects",
      "read:members",
      "write:members",
      "read:webhooks",
      "write:webhooks",
    ] as const,
  },

  auditLogs: {
    enabled: true,
    retentionDays: 90,
    events: [
      "user.login",
      "user.logout",
      "user.updated",
      "user.deleted",
      "organization.created",
      "organization.updated",
      "organization.deleted",
      "member.invited",
      "member.joined",
      "member.updated",
      "member.removed",
      "project.created",
      "project.updated",
      "project.deleted",
      "api_key.created",
      "api_key.deleted",
      "webhook.created",
      "webhook.updated",
      "webhook.deleted",
      "subscription.created",
      "subscription.updated",
      "subscription.canceled",
    ] as const,
  },

  fileUploads: {
    enabled: true,
    maxFileSizeMB: 10,
    allowedMimeTypes: ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"],
    provider: "s3" as const,
  },

  jobs: {
    enabled: true,
    redis: {
      host: process.env.REDIS_HOST ?? "localhost",
      port: parseInt(process.env.REDIS_PORT ?? "6379", 10),
    },
    queues: {
      email: { concurrency: 5 },
      webhook: { concurrency: 10 },
      cleanup: { concurrency: 1 },
    },
  },

  cache: {
    enabled: true,
    provider: "redis" as const,
    defaultTtl: 300, // 5 minutes
  },
} as const;

export type FeaturesConfig = typeof featuresConfig;
export type OrgRole = (typeof featuresConfig.organizations.roles)[number];
export type WebhookEvent = (typeof featuresConfig.webhooks.events)[number];
export type ApiKeyScope = (typeof featuresConfig.apiKeys.scopes)[number];
export type AuditEvent = (typeof featuresConfig.auditLogs.events)[number];
