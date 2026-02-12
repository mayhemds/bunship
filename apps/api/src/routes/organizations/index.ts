/**
 * Organization management routes
 * Handles CRUD operations for organizations
 */
import { Elysia } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requireOwner, requireAdmin, requirePermission } from "../../middleware/roles";
import { getDatabase, eq, and, isNull } from "@bunship/database";
import { organizations, memberships, invitations } from "@bunship/database/schema";
import { createId } from "@paralleldrive/cuid2";
import { ValidationError, NotFoundError, ConflictError, AuthorizationError } from "@bunship/utils";
import { isValidSlug, sanitizeSlug } from "@bunship/utils";
import {
  OrganizationSchema,
  CreateOrganizationSchema,
  UpdateOrganizationSchema,
  OrganizationsListSchema,
  MessageSchema,
  ErrorSchema,
} from "./schemas";
import { memberRoutes } from "./members";
import { invitationRoutes } from "./invitations";
import { billingRoutes } from "./billing";
import { webhookRoutes } from "./webhooks";
import { apiKeyRoutes } from "./api-keys";
import { auditLogsRoutes } from "./audit-logs";
import { filesRoutes } from "./files";

export const organizationRoutes = new Elysia({ prefix: "/organizations", tags: ["Organizations"] })
  .use(authMiddleware)
  /**
   * Create new organization
   */
  .post(
    "/",
    async ({ user, body, set }) => {
      const db = getDatabase();

      // Validate slug format
      if (!isValidSlug(body.slug)) {
        set.status = 400;
        throw new ValidationError("Slug must be lowercase letters, numbers, and hyphens only");
      }

      // Check if slug already exists
      const existingOrg = await db.query.organizations.findFirst({
        where: and(eq(organizations.slug, body.slug), isNull(organizations.deletedAt)),
      });

      if (existingOrg) {
        set.status = 409;
        throw new ConflictError("Organization slug already exists");
      }

      // Create organization
      const orgId = createId();
      const [org] = await db
        .insert(organizations)
        .values({
          id: orgId,
          name: body.name,
          slug: body.slug,
          description: body.description,
          logoUrl: body.logoUrl,
          settings: {},
          createdBy: user.id,
        })
        .returning();

      // Create owner membership
      await db.insert(memberships).values({
        userId: user.id,
        organizationId: orgId,
        role: "owner",
      });

      return {
        id: org.id,
        name: org.name,
        slug: org.slug,
        description: org.description,
        logoUrl: org.logoUrl,
        settings: org.settings || {},
        createdBy: org.createdBy,
        createdAt: org.createdAt.toISOString(),
        updatedAt: org.updatedAt.toISOString(),
      };
    },
    {
      body: CreateOrganizationSchema,
      response: {
        201: OrganizationSchema,
        400: ErrorSchema,
        401: ErrorSchema,
        409: ErrorSchema,
      },
      detail: {
        summary: "Create organization",
        description: "Creates a new organization. The creator becomes the owner.",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  /**
   * List user's organizations
   */
  .get(
    "/",
    async ({ user }) => {
      const db = getDatabase();

      const userMemberships = await db.query.memberships.findMany({
        where: eq(memberships.userId, user.id),
        with: {
          organization: true,
        },
        orderBy: (memberships, { desc }) => [desc(memberships.createdAt)],
      });

      const orgs = userMemberships
        .filter((m) => m.organization && !m.organization.deletedAt)
        .map((m) => ({
          id: m.organization!.id,
          name: m.organization!.name,
          slug: m.organization!.slug,
          description: m.organization!.description,
          logoUrl: m.organization!.logoUrl,
          settings: m.organization!.settings || {},
          createdBy: m.organization!.createdBy,
          createdAt: m.organization!.createdAt.toISOString(),
          updatedAt: m.organization!.updatedAt.toISOString(),
        }));

      return {
        organizations: orgs,
        total: orgs.length,
      };
    },
    {
      response: {
        200: OrganizationsListSchema,
        401: ErrorSchema,
      },
      detail: {
        summary: "List organizations",
        description: "Returns all organizations the user is a member of",
        security: [{ bearerAuth: [] }],
      },
    }
  )
  // Single-org routes — use organizationMiddleware via .use() so derive() injects context
  .use(
    new Elysia({ tags: ["Organizations"] })
      .use(authMiddleware)
      .use(organizationMiddleware)
      /**
       * Get organization by ID
       */
      .get(
        "/:orgId",
        async ({ organization }) => {
          return {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            description: organization.description,
            logoUrl: organization.logoUrl,
            settings: organization.settings || {},
            createdBy: organization.createdBy,
            createdAt: organization.createdAt.toISOString(),
            updatedAt: organization.updatedAt.toISOString(),
          };
        },
        {
          response: {
            200: OrganizationSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            404: ErrorSchema,
          },
          detail: {
            summary: "Get organization",
            description: "Returns details of a specific organization",
            security: [{ bearerAuth: [] }],
          },
        }
      )
      /**
       * Update organization
       */
      .patch(
        "/:orgId",
        async ({ organization, body, set }) => {
          const db = getDatabase();

          // Build update object
          const updateData: any = {};
          if (body.name !== undefined) updateData.name = body.name;
          if (body.description !== undefined) updateData.description = body.description;
          if (body.logoUrl !== undefined) updateData.logoUrl = body.logoUrl;

          if (body.settings !== undefined) {
            // Merge with existing settings
            updateData.settings = {
              ...(organization.settings || {}),
              ...body.settings,
            };
          }

          const [updated] = await db
            .update(organizations)
            .set(updateData)
            .where(eq(organizations.id, organization.id))
            .returning();

          if (!updated) {
            set.status = 404;
            throw new NotFoundError("Organization");
          }

          return {
            id: updated.id,
            name: updated.name,
            slug: updated.slug,
            description: updated.description,
            logoUrl: updated.logoUrl,
            settings: updated.settings || {},
            createdBy: updated.createdBy,
            createdAt: updated.createdAt.toISOString(),
            updatedAt: updated.updatedAt.toISOString(),
          };
        },
        {
          beforeHandle: [requirePermission("org:update")],
          body: UpdateOrganizationSchema,
          response: {
            200: OrganizationSchema,
            400: ErrorSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            404: ErrorSchema,
          },
          detail: {
            summary: "Update organization",
            description: "Updates organization details. Requires org:update permission.",
            security: [{ bearerAuth: [] }],
          },
        }
      )
      /**
       * Delete organization (owner only)
       */
      .delete(
        "/:orgId",
        async ({ organization, set }) => {
          const db = getDatabase();

          // Soft delete organization
          await db
            .update(organizations)
            .set({ deletedAt: new Date() })
            .where(eq(organizations.id, organization.id));

          return { message: "Organization deleted successfully" };
        },
        {
          beforeHandle: [requireOwner],
          response: {
            200: MessageSchema,
            400: ErrorSchema,
            401: ErrorSchema,
            403: ErrorSchema,
            404: ErrorSchema,
          },
          detail: {
            summary: "Delete organization",
            description: "Soft deletes an organization. Only the owner can perform this action.",
            security: [{ bearerAuth: [] }],
          },
        }
      )
  )
  // Mount sub-routes
  .use(memberRoutes)
  .use(invitationRoutes)
  .use(billingRoutes)
  .use(webhookRoutes)
  .use(apiKeyRoutes)
  .use(auditLogsRoutes)
  .use(filesRoutes);
