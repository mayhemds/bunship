import { relations } from "drizzle-orm";
import { users } from "./users";
import { organizations } from "./organizations";
import { memberships } from "./memberships";
import { invitations } from "./invitations";
import { subscriptions } from "./subscriptions";
import { sessions } from "./sessions";
import { verificationTokens } from "./verificationTokens";
import { webhooks } from "./webhooks";
import { webhookDeliveries } from "./webhookDeliveries";
import { apiKeys } from "./apiKeys";
import { auditLogs } from "./auditLogs";
import { projects } from "./projects";
import { files } from "./files";
import { backupCodes, backupCodesRelations } from "./backupCodes";

/**
 * User relations
 */
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
  sessions: many(sessions),
  verificationTokens: many(verificationTokens),
  backupCodes: many(backupCodes),
  createdOrganizations: many(organizations),
  sentInvitations: many(invitations),
  createdApiKeys: many(apiKeys),
  createdProjects: many(projects),
  uploadedFiles: many(files),
}));

/**
 * Organization relations
 */
export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  creator: one(users, {
    fields: [organizations.createdBy],
    references: [users.id],
  }),
  memberships: many(memberships),
  invitations: many(invitations),
  subscription: one(subscriptions),
  webhooks: many(webhooks),
  apiKeys: many(apiKeys),
  auditLogs: many(auditLogs),
  projects: many(projects),
  files: many(files),
}));

/**
 * Membership relations
 */
export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, {
    fields: [memberships.userId],
    references: [users.id],
  }),
  organization: one(organizations, {
    fields: [memberships.organizationId],
    references: [organizations.id],
  }),
}));

/**
 * Invitation relations
 */
export const invitationsRelations = relations(invitations, ({ one }) => ({
  organization: one(organizations, {
    fields: [invitations.organizationId],
    references: [organizations.id],
  }),
  invitedByUser: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

/**
 * Subscription relations
 */
export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  organization: one(organizations, {
    fields: [subscriptions.organizationId],
    references: [organizations.id],
  }),
}));

/**
 * Session relations
 */
export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

/**
 * Verification token relations
 */
export const verificationTokensRelations = relations(verificationTokens, ({ one }) => ({
  user: one(users, {
    fields: [verificationTokens.userId],
    references: [users.id],
  }),
}));

/**
 * Webhook relations
 */
export const webhooksRelations = relations(webhooks, ({ one, many }) => ({
  organization: one(organizations, {
    fields: [webhooks.organizationId],
    references: [organizations.id],
  }),
  deliveries: many(webhookDeliveries),
}));

/**
 * Webhook delivery relations
 */
export const webhookDeliveriesRelations = relations(webhookDeliveries, ({ one }) => ({
  webhook: one(webhooks, {
    fields: [webhookDeliveries.webhookId],
    references: [webhooks.id],
  }),
}));

/**
 * API key relations
 */
export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  organization: one(organizations, {
    fields: [apiKeys.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [apiKeys.createdBy],
    references: [users.id],
  }),
}));

/**
 * Audit log relations
 */
export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  organization: one(organizations, {
    fields: [auditLogs.organizationId],
    references: [organizations.id],
  }),
}));

/**
 * Project relations
 */
export const projectsRelations = relations(projects, ({ one }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
  }),
}));

/**
 * File relations
 */
export const filesRelations = relations(files, ({ one }) => ({
  organization: one(organizations, {
    fields: [files.organizationId],
    references: [organizations.id],
  }),
  uploader: one(users, {
    fields: [files.uploadedBy],
    references: [users.id],
  }),
}));

// Re-export backup codes relations (imported above for use in this file)
export { backupCodesRelations };

// Export all schemas
export {
  users,
  organizations,
  memberships,
  invitations,
  subscriptions,
  sessions,
  verificationTokens,
  webhooks,
  webhookDeliveries,
  apiKeys,
  auditLogs,
  projects,
  files,
  backupCodes,
};

// Export all types
export type { User, NewUser } from "./users";
export type { Organization, NewOrganization } from "./organizations";
export type { Membership, NewMembership, MembershipRole } from "./memberships";
export type { Invitation, NewInvitation } from "./invitations";
export type { Subscription, NewSubscription, SubscriptionStatus } from "./subscriptions";
export type { Session, NewSession } from "./sessions";
export type { VerificationToken, NewVerificationToken, TokenType } from "./verificationTokens";
export type { Webhook, NewWebhook } from "./webhooks";
export type { WebhookDelivery, NewWebhookDelivery } from "./webhookDeliveries";
export type { ApiKey, NewApiKey } from "./apiKeys";
export type { AuditLog, NewAuditLog, ActorType } from "./auditLogs";
export type { Project, NewProject } from "./projects";
export type { File, NewFile } from "./files";
export type { BackupCode, NewBackupCode } from "./backupCodes";
