/**
 * S3-compatible storage service
 * Handles file uploads, downloads, and management
 */
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { getDatabase } from "@bunship/database";
import { files, type NewFile } from "@bunship/database/schema";
import { eq, and, desc, isNull, like, sql } from "drizzle-orm";
import { createId } from "@paralleldrive/cuid2";
import { InternalError, NotFoundError, ValidationError } from "@bunship/utils";

/**
 * S3 client configuration
 */
const s3Client = new S3Client({
  region: process.env.AWS_REGION ?? "us-east-1",
  credentials: process.env.AWS_ACCESS_KEY_ID
    ? {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    : undefined,
  endpoint: process.env.S3_ENDPOINT, // For S3-compatible services like MinIO, R2, etc.
  forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // Required for some S3-compatible services
});

const DEFAULT_BUCKET = process.env.S3_BUCKET ?? "bunship-files";
const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE ?? "52428800", 10); // 50 MB default

/**
 * Upload options
 */
export interface UploadOptions {
  organizationId: string;
  uploadedBy: string;
  name?: string;
  isPublic?: boolean;
  expiresIn?: number; // Expiration time in seconds (for temporary files)
  metadata?: Record<string, unknown>;
  mimeType?: string;
  bucket?: string;
}

/**
 * List options
 */
export interface ListOptions {
  limit?: number;
  offset?: number;
  mimeType?: string;
  includeDeleted?: boolean;
}

/**
 * Storage service
 * Provides methods for file upload, download, and management
 */
export const storageService = {
  /**
   * Upload a file to S3-compatible storage
   *
   * @param file - File data (Buffer, ArrayBuffer, or Blob)
   * @param options - Upload options
   * @returns Created file record
   *
   * @example
   * ```typescript
   * const file = await storageService.upload(buffer, {
   *   organizationId: "org_123",
   *   uploadedBy: "user_123",
   *   name: "document.pdf",
   *   mimeType: "application/pdf",
   *   isPublic: false,
   * });
   * ```
   */
  async upload(file: Buffer | ArrayBuffer | Blob, options: UploadOptions) {
    try {
      // Validate file size
      const fileSize =
        file instanceof Buffer
          ? file.length
          : file instanceof ArrayBuffer
            ? file.byteLength
            : (file as Blob).size;

      if (fileSize > MAX_FILE_SIZE) {
        throw new ValidationError(
          `File size exceeds maximum allowed size of ${MAX_FILE_SIZE} bytes`
        );
      }

      if (fileSize === 0) {
        throw new ValidationError("File is empty");
      }

      const db = getDatabase();
      const fileId = createId();
      const bucket = options.bucket ?? DEFAULT_BUCKET;

      // Generate S3 key with organization prefix for isolation
      const safeName = (options.name ?? "file")
        .replace(/\.\./g, "") // Remove path traversal
        .replace(/[^a-zA-Z0-9._-]/g, "_") // Only safe chars
        .slice(0, 255); // Limit length
      const key = `${options.organizationId}/${fileId}/${safeName}`;

      // Determine MIME type
      const mimeType = options.mimeType ?? "application/octet-stream";

      // Upload to S3
      const uploadParams: PutObjectCommandInput = {
        Bucket: bucket,
        Key: key,
        Body: (file instanceof Blob ? new Uint8Array(await file.arrayBuffer()) : file) as any,
        ContentType: mimeType,
        Metadata: {
          organizationId: options.organizationId,
          uploadedBy: options.uploadedBy,
          fileId,
          ...(options.metadata &&
            Object.fromEntries(Object.entries(options.metadata).map(([k, v]) => [k, String(v)]))),
        },
      };

      // Set cache control based on public/private
      if (options.isPublic) {
        uploadParams.CacheControl = "public, max-age=31536000"; // 1 year
      } else {
        uploadParams.CacheControl = "private, no-cache";
      }

      await s3Client.send(new PutObjectCommand(uploadParams));

      // Create database record
      const expiresAt = options.expiresIn
        ? new Date(Date.now() + options.expiresIn * 1000)
        : undefined;

      const newFile: NewFile = {
        id: fileId,
        organizationId: options.organizationId,
        uploadedBy: options.uploadedBy,
        name: options.name ?? "file",
        key,
        bucket,
        size: fileSize,
        mimeType,
        metadata: options.metadata,
        isPublic: options.isPublic ?? false,
        expiresAt,
      };

      const [fileRecord] = await db.insert(files).values(newFile).returning();

      return fileRecord!;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error("Failed to upload file:", error);
      throw new InternalError("Failed to upload file");
    }
  },

  /**
   * Get a signed URL for downloading a file
   *
   * @param fileId - File ID
   * @param expiresIn - URL expiration time in seconds (default: 3600 = 1 hour)
   * @returns Signed URL for file download
   *
   * @example
   * ```typescript
   * const url = await storageService.getSignedUrl("file_123", 3600);
   * ```
   */
  async getSignedUrl(fileId: string, expiresIn: number = 900, organizationId?: string) {
    try {
      const db = getDatabase();

      // Get file record with optional org filter
      const conditions = [eq(files.id, fileId), isNull(files.deletedAt)];
      if (organizationId) {
        conditions.push(eq(files.organizationId, organizationId));
      }
      const fileRecord = await db.query.files.findFirst({
        where: and(...conditions),
      });

      if (!fileRecord) {
        throw new NotFoundError("File");
      }

      // Check if file is expired
      if (fileRecord.expiresAt && fileRecord.expiresAt < new Date()) {
        throw new NotFoundError("File has expired");
      }

      // Generate signed URL
      const command = new GetObjectCommand({
        Bucket: fileRecord.bucket,
        Key: fileRecord.key,
      });

      const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });

      return {
        url: signedUrl,
        expiresIn,
        file: fileRecord,
      };
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Failed to get signed URL:", error);
      throw new InternalError("Failed to get signed URL");
    }
  },

  /**
   * Delete a file from storage and database
   *
   * @param fileId - File ID
   * @param organizationId - Organization ID (for authorization)
   * @param hardDelete - If true, permanently delete from S3 and database. If false, soft delete.
   * @returns Deleted file record
   *
   * @example
   * ```typescript
   * await storageService.delete("file_123", "org_123", false);
   * ```
   */
  async delete(fileId: string, organizationId: string, hardDelete: boolean = false) {
    try {
      const db = getDatabase();

      // Get file record
      const fileRecord = await db.query.files.findFirst({
        where: and(
          eq(files.id, fileId),
          eq(files.organizationId, organizationId),
          isNull(files.deletedAt)
        ),
      });

      if (!fileRecord) {
        throw new NotFoundError("File");
      }

      if (hardDelete) {
        // Delete from S3
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: fileRecord.bucket,
            Key: fileRecord.key,
          })
        );

        // Delete from database
        await db.delete(files).where(eq(files.id, fileId));
      } else {
        // Soft delete
        await db.update(files).set({ deletedAt: new Date() }).where(eq(files.id, fileId));
      }

      return fileRecord;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Failed to delete file:", error);
      throw new InternalError("Failed to delete file");
    }
  },

  /**
   * List files for an organization
   *
   * @param organizationId - Organization ID
   * @param options - List options
   * @returns Array of files and total count
   *
   * @example
   * ```typescript
   * const { files, total } = await storageService.list("org_123", {
   *   limit: 50,
   *   offset: 0,
   *   mimeType: "image/",
   * });
   * ```
   */
  async list(organizationId: string, options: ListOptions = {}) {
    try {
      const db = getDatabase();
      const limit = options.limit ?? 50;
      const offset = options.offset ?? 0;

      // Build WHERE conditions
      const conditions = [eq(files.organizationId, organizationId)];

      if (!options.includeDeleted) {
        conditions.push(isNull(files.deletedAt));
      }

      // Query files with pagination
      let query = db
        .select()
        .from(files)
        .where(and(...conditions));

      // Filter by MIME type prefix (e.g., "image/" matches all images)
      if (options.mimeType) {
        conditions.push(like(files.mimeType, `${options.mimeType}%`));
        query = db
          .select()
          .from(files)
          .where(and(...conditions));
      }

      const [filesList, countRows] = await Promise.all([
        query.orderBy(desc(files.createdAt)).limit(limit).offset(offset),
        db
          .select({ count: sql<number>`count(*)` })
          .from(files)
          .where(and(...conditions)),
      ]);
      const count = countRows[0]?.count ?? 0;

      return {
        files: filesList,
        total: Number(count) || 0,
        limit,
        offset,
      };
    } catch (error) {
      console.error("Failed to list files:", error);
      throw new InternalError("Failed to list files");
    }
  },

  /**
   * Get file metadata
   *
   * @param fileId - File ID
   * @param organizationId - Organization ID (for authorization)
   * @returns File record
   *
   * @example
   * ```typescript
   * const file = await storageService.get("file_123", "org_123");
   * ```
   */
  async get(fileId: string, organizationId: string) {
    try {
      const db = getDatabase();

      const fileRecord = await db.query.files.findFirst({
        where: and(
          eq(files.id, fileId),
          eq(files.organizationId, organizationId),
          isNull(files.deletedAt)
        ),
      });

      if (!fileRecord) {
        throw new NotFoundError("File");
      }

      // Check if file is expired
      if (fileRecord.expiresAt && fileRecord.expiresAt < new Date()) {
        throw new NotFoundError("File has expired");
      }

      return fileRecord;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      console.error("Failed to get file:", error);
      throw new InternalError("Failed to get file");
    }
  },

  /**
   * Check if file exists in S3
   *
   * @param fileId - File ID
   * @param organizationId - Organization ID
   * @returns True if file exists in both database and S3
   */
  async exists(fileId: string, organizationId: string): Promise<boolean> {
    try {
      const fileRecord = await this.get(fileId, organizationId);

      // Check S3
      await s3Client.send(
        new HeadObjectCommand({
          Bucket: fileRecord.bucket,
          Key: fileRecord.key,
        })
      );

      return true;
    } catch (error) {
      return false;
    }
  },
};
