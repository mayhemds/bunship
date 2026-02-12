/**
 * Admin routes
 * Superuser administration endpoints
 */
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { adminMiddleware } from "../../middleware/admin";
import * as adminService from "../../services/admin.service";

export const adminRoutes = new Elysia({ prefix: "/admin", tags: ["Admin"] })
  // Apply auth and admin middleware to all routes
  .use(authMiddleware)
  .use(adminMiddleware)

  // ========== USER MANAGEMENT ==========

  .get(
    "/users",
    async ({ query }) => {
      const filters = {
        email: query.email,
        isActive: query.isActive !== undefined ? query.isActive === "true" : undefined,
        isAdmin: query.isAdmin !== undefined ? query.isAdmin === "true" : undefined,
        search: query.search,
      };

      const pagination = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 50,
      };

      return await adminService.listUsers(filters, pagination);
    },
    {
      query: t.Object({
        email: t.Optional(t.String()),
        isActive: t.Optional(t.String()),
        isAdmin: t.Optional(t.String()),
        search: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        summary: "List all users",
        description: "Get paginated list of all users with optional filters",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .get(
    "/users/:id",
    async ({ params }) => {
      return await adminService.getUser(params.id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get user details",
        description: "Get detailed information about a specific user",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .patch(
    "/users/:id",
    async ({ params, body }) => {
      return await adminService.updateUser(params.id, body);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      body: t.Object({
        fullName: t.Optional(t.String()),
        avatarUrl: t.Optional(t.String()),
        isActive: t.Optional(t.Boolean()),
        isAdmin: t.Optional(t.Boolean()),
        emailVerified: t.Optional(t.String()),
      }),
      detail: {
        summary: "Update user",
        description: "Update user details (admin only)",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .delete(
    "/users/:id",
    async ({ params, set }) => {
      await adminService.deleteUser(params.id);
      set.status = 204;
      return null;
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Delete user",
        description: "Soft delete a user (cannot delete admin users)",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .post(
    "/users/:id/impersonate",
    async ({ params, user }) => {
      return await adminService.impersonateUser(params.id, {
        id: user.id,
        email: user.email,
      });
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Impersonate user",
        description: "Generate access token to impersonate a user",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ========== ORGANIZATION MANAGEMENT ==========

  .get(
    "/organizations",
    async ({ query }) => {
      const filters = {
        search: query.search,
        hasSubscription:
          query.hasSubscription !== undefined ? query.hasSubscription === "true" : undefined,
      };

      const pagination = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 50,
      };

      return await adminService.listOrganizations(filters, pagination);
    },
    {
      query: t.Object({
        search: t.Optional(t.String()),
        hasSubscription: t.Optional(t.String()),
        page: t.Optional(t.String()),
        limit: t.Optional(t.String()),
      }),
      detail: {
        summary: "List all organizations",
        description: "Get paginated list of all organizations with optional filters",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .get(
    "/organizations/:id",
    async ({ params }) => {
      return await adminService.getOrganization(params.id);
    },
    {
      params: t.Object({
        id: t.String(),
      }),
      detail: {
        summary: "Get organization details",
        description: "Get detailed information about a specific organization",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  // ========== SYSTEM MANAGEMENT ==========

  .get(
    "/system/stats",
    async () => {
      return await adminService.getSystemStats();
    },
    {
      detail: {
        summary: "Get system statistics",
        description: "Get comprehensive system usage statistics",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .get(
    "/system/maintenance",
    async () => {
      return await adminService.getMaintenanceMode();
    },
    {
      detail: {
        summary: "Get maintenance mode status",
        description: "Check if maintenance mode is enabled",
        security: [{ bearerAuth: [] }],
      },
    }
  )

  .post(
    "/system/maintenance",
    async ({ body }) => {
      return await adminService.setMaintenanceMode(body.enabled);
    },
    {
      body: t.Object({
        enabled: t.Boolean(),
      }),
      detail: {
        summary: "Toggle maintenance mode",
        description: "Enable or disable system maintenance mode",
        security: [{ bearerAuth: [] }],
      },
    }
  );
