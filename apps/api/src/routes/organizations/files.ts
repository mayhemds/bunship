/**
 * File upload and management routes
 * Handles file operations with S3-compatible storage
 */
import { Elysia, t } from "elysia";
import { authMiddleware } from "../../middleware/auth";
import { organizationMiddleware } from "../../middleware/organization";
import { requirePermission } from "../../middleware/roles";
import { storageService } from "../../services/storage.service";
import { auditService } from "../../services/audit.service";
import { ValidationError } from "@bunship/utils";

const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "text/markdown",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  "application/zip",
]);

/**
 * File routes
 * All routes require authentication and organization membership
 */
export const filesRoutes = new Elysia({ prefix: "/:orgId/files", tags: ["Files"] })
  .use(authMiddleware)
  .use(organizationMiddleware)
  .post(
    "/",
    async ({ body, organization, user, headers }) => {
      const { file, name, isPublic, expiresIn, metadata } = body;

      // Validate file
      if (!file || !(file instanceof File)) {
        throw new ValidationError("File is required");
      }

      // Validate MIME type
      if (!ALLOWED_MIME_TYPES.has(file.type)) {
        throw new ValidationError(`File type '${file.type}' is not allowed`);
      }

      // Upload file directly — storageService handles Blob/Buffer/ArrayBuffer
      const uploadedFile = await storageService.upload(file, {
        organizationId: organization.id,
        uploadedBy: user.id,
        name: name ?? file.name,
        mimeType: file.type,
        isPublic: isPublic ?? false,
        expiresIn,
        metadata,
      });

      // Log audit
      await auditService.logUserAction({
        organizationId: organization.id,
        userId: user.id,
        userEmail: user.email,
        action: "file.uploaded",
        resourceType: "file",
        resourceId: uploadedFile.id,
        newValues: {
          name: uploadedFile.name,
          size: uploadedFile.size,
          mimeType: uploadedFile.mimeType,
        },
        ipAddress: headers["x-forwarded-for"] ?? headers["x-real-ip"],
        userAgent: headers["user-agent"],
      });

      return {
        success: true,
        data: uploadedFile,
      };
    },
    {
      beforeHandle: [requirePermission("files:upload")],
      body: t.Object({
        file: t.File({
          description: "File to upload",
          maxSize: parseInt(process.env.MAX_FILE_SIZE ?? "52428800", 10), // 50 MB
        }),
        name: t.Optional(t.String({ description: "Custom file name" })),
        isPublic: t.Optional(
          t.Boolean({
            description: "Whether file is publicly accessible",
            default: false,
          })
        ),
        expiresIn: t.Optional(
          t.Number({
            description: "Expiration time in seconds (for temporary files)",
            minimum: 60,
            maximum: 86400 * 7, // Max 7 days
          })
        ),
        metadata: t.Optional(
          t.Record(t.String(), t.Any(), {
            description: "Custom metadata",
          })
        ),
      }),
      detail: {
        summary: "Upload a file",
        description: "Upload a file to S3-compatible storage",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "File uploaded successfully",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        organizationId: { type: "string" },
                        uploadedBy: { type: "string" },
                        name: { type: "string" },
                        key: { type: "string" },
                        bucket: { type: "string" },
                        size: { type: "number" },
                        mimeType: { type: "string" },
                        isPublic: { type: "boolean" },
                        expiresAt: { type: "string", format: "date-time", nullable: true },
                        createdAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          400: { description: "Invalid file or file too large" },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
        },
      },
    }
  )
  .get(
    "/",
    async ({ query, organization }) => {
      const options = {
        limit: query.limit,
        offset: query.offset,
        mimeType: query.mimeType,
        includeDeleted: query.includeDeleted,
      };

      const result = await storageService.list(organization.id, options);

      return {
        success: true,
        data: result.files,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
          hasMore: result.offset + result.limit < result.total,
        },
      };
    },
    {
      beforeHandle: [requirePermission("files:read")],
      query: t.Object({
        limit: t.Optional(
          t.Number({
            minimum: 1,
            maximum: 100,
            default: 50,
            description: "Number of files to return (1-100)",
          })
        ),
        offset: t.Optional(
          t.Number({
            minimum: 0,
            default: 0,
            description: "Number of files to skip",
          })
        ),
        mimeType: t.Optional(
          t.String({
            description: "Filter by MIME type prefix (e.g., 'image/', 'video/')",
          })
        ),
        includeDeleted: t.Optional(
          t.Boolean({
            description: "Include soft-deleted files",
            default: false,
          })
        ),
      }),
      detail: {
        summary: "List files",
        description: "Get a paginated list of files for the organization",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "List of files",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          organizationId: { type: "string" },
                          uploadedBy: { type: "string" },
                          name: { type: "string" },
                          key: { type: "string" },
                          bucket: { type: "string" },
                          size: { type: "number" },
                          mimeType: { type: "string" },
                          isPublic: { type: "boolean" },
                          metadata: { type: "object", nullable: true },
                          expiresAt: { type: "string", format: "date-time", nullable: true },
                          createdAt: { type: "string", format: "date-time" },
                        },
                      },
                    },
                    pagination: {
                      type: "object",
                      properties: {
                        total: { type: "number" },
                        limit: { type: "number" },
                        offset: { type: "number" },
                        hasMore: { type: "boolean" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
        },
      },
    }
  )
  .get(
    "/:id",
    async ({ params, organization }) => {
      const file = await storageService.get(params.id, organization.id);

      return {
        success: true,
        data: file,
      };
    },
    {
      beforeHandle: [requirePermission("files:read")],
      params: t.Object({
        id: t.String({ description: "File ID" }),
      }),
      detail: {
        summary: "Get file metadata",
        description: "Get metadata for a specific file",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "File metadata",
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
          404: { description: "File not found" },
        },
      },
    }
  )
  .get(
    "/:id/download",
    async ({ params, query, organization }) => {
      const expiresIn = query.expiresIn ?? 3600; // Default 1 hour

      const result = await storageService.getSignedUrl(params.id, expiresIn, organization.id);

      return {
        success: true,
        data: {
          url: result.url,
          expiresIn: result.expiresIn,
          expiresAt: new Date(Date.now() + result.expiresIn * 1000),
        },
      };
    },
    {
      beforeHandle: [requirePermission("files:read")],
      params: t.Object({
        id: t.String({ description: "File ID" }),
      }),
      query: t.Object({
        expiresIn: t.Optional(
          t.Number({
            minimum: 60,
            maximum: 86400, // Max 24 hours
            default: 3600,
            description: "URL expiration time in seconds",
          })
        ),
      }),
      detail: {
        summary: "Get file download URL",
        description: "Get a signed URL for downloading the file",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "Signed download URL",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean" },
                    data: {
                      type: "object",
                      properties: {
                        url: { type: "string", format: "uri" },
                        expiresIn: { type: "number" },
                        expiresAt: { type: "string", format: "date-time" },
                      },
                    },
                  },
                },
              },
            },
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
          404: { description: "File not found" },
        },
      },
    }
  )
  .delete(
    "/:id",
    async ({ params, query, organization, user, headers }) => {
      const hardDelete = query.hard ?? false;

      const deletedFile = await storageService.delete(params.id, organization.id, hardDelete);

      // Log audit
      await auditService.logUserAction({
        organizationId: organization.id,
        userId: user.id,
        userEmail: user.email,
        action: hardDelete ? "file.hard_deleted" : "file.deleted",
        resourceType: "file",
        resourceId: deletedFile.id,
        oldValues: {
          name: deletedFile.name,
          size: deletedFile.size,
        },
        ipAddress: headers["x-forwarded-for"] ?? headers["x-real-ip"],
        userAgent: headers["user-agent"],
      });

      return {
        success: true,
        data: {
          message: hardDelete ? "File permanently deleted" : "File deleted",
        },
      };
    },
    {
      beforeHandle: [requirePermission("files:delete")],
      params: t.Object({
        id: t.String({ description: "File ID" }),
      }),
      query: t.Object({
        hard: t.Optional(
          t.Boolean({
            description: "Permanently delete file (hard delete)",
            default: false,
          })
        ),
      }),
      detail: {
        summary: "Delete file",
        description: "Delete a file (soft delete by default, hard delete with ?hard=true)",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "File deleted",
          },
          401: { description: "Unauthorized" },
          403: { description: "Forbidden - not a member of this organization" },
          404: { description: "File not found" },
        },
      },
    }
  );
