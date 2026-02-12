/**
 * Storage Service Tests
 */
import { describe, it, expect, beforeAll, beforeEach, mock } from "bun:test";
import { mockDatabase } from "../helpers/database-mock";

// ── Mock AWS SDK ────────────────────────────────────────────────────────────
const mockS3Send = mock(() => Promise.resolve({}));

mock.module("@aws-sdk/client-s3", () => ({
  S3Client: class MockS3Client {
    send = mockS3Send;
  },
  PutObjectCommand: class MockPutObjectCommand {
    constructor(public input: unknown) {}
  },
  GetObjectCommand: class MockGetObjectCommand {
    constructor(public input: unknown) {}
  },
  DeleteObjectCommand: class MockDeleteObjectCommand {
    constructor(public input: unknown) {}
  },
  HeadObjectCommand: class MockHeadObjectCommand {
    constructor(public input: unknown) {}
  },
}));

mock.module("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: mock(() => Promise.resolve("https://s3.example.com/signed-url")),
}));

// ── Mock @paralleldrive/cuid2 ───────────────────────────────────────────────
let cuidCounter = 0;
mock.module("@paralleldrive/cuid2", () => ({
  createId: () => `cuid_${++cuidCounter}`,
}));

// ── Mock @bunship/database ──────────────────────────────────────────────────
const mockDbInsert = mock(() => ({
  values: mock(() => ({
    returning: mock(() =>
      Promise.resolve([
        {
          id: "file-1",
          organizationId: "org-1",
          name: "test.txt",
          key: "org-1/cuid_1/test.txt",
          bucket: "bunship-files",
          size: 100,
          mimeType: "text/plain",
          isPublic: false,
        },
      ])
    ),
  })),
}));

mockDatabase({
  getDatabase: () => ({
    insert: mockDbInsert,
    query: {
      files: {
        findFirst: mock(() => Promise.resolve(null)),
      },
    },
    select: mock(() => ({
      from: mock(() => ({
        where: mock(() => ({
          orderBy: mock(() => ({
            limit: mock(() => ({
              offset: mock(() => Promise.resolve([])),
            })),
          })),
        })),
      })),
    })),
    update: mock(() => ({
      set: mock(() => ({ where: mock(() => Promise.resolve()) })),
    })),
    delete: mock(() => ({ where: mock(() => Promise.resolve()) })),
  }),
});
// ── Import under test (dynamic to ensure mocks are applied first) ───────────
let storageService: typeof import("../../services/storage.service").storageService;

beforeAll(async () => {
  const mod = await import("../../services/storage.service");
  storageService = mod.storageService;
});

// ── Tests ───────────────────────────────────────────────────────────────────

describe("storage.service", () => {
  beforeEach(() => {
    cuidCounter = 0;
    mockS3Send.mockClear();
    mockDbInsert.mockClear();
  });

  // ── Filename sanitization ─────────────────────────────────────────────
  describe("filename sanitization", () => {
    it("strips path traversal sequences (../) from filenames", async () => {
      const fileBuffer = Buffer.from("hello");

      // We need to capture what key is sent to S3
      let capturedInput: any = null;
      mockS3Send.mockImplementation((cmd: any) => {
        capturedInput = cmd.input;
        return Promise.resolve({});
      });

      // Override insert to capture values and return a record
      const capturedValues: any[] = [];
      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-1",
            organizationId: "org-1",
            name: "etcpasswd",
            key: "org-1/cuid_1/etcpasswd",
            bucket: "bunship-files",
            size: 5,
            mimeType: "application/octet-stream",
            isPublic: false,
          },
        ])
      );
      const valuesMock = mock((vals: any) => {
        capturedValues.push(vals);
        return { returning: returningMock };
      });
      mockDbInsert.mockReturnValue({ values: valuesMock } as any);

      await storageService.upload(fileBuffer, {
        organizationId: "org-1",
        uploadedBy: "user-1",
        name: "../../../etc/passwd",
      });

      // The S3 key should not contain ".." at all
      expect(capturedInput?.Key).toBeDefined();
      expect(capturedInput.Key).not.toContain("..");
    });

    it("replaces unsafe characters with underscores", async () => {
      const fileBuffer = Buffer.from("data");
      let capturedInput: any = null;
      mockS3Send.mockImplementation((cmd: any) => {
        capturedInput = cmd.input;
        return Promise.resolve({});
      });

      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-2",
            organizationId: "org-1",
            name: "my_file_name_.txt",
            key: "org-1/cuid_1/my_file_name_.txt",
            bucket: "bunship-files",
            size: 4,
            mimeType: "application/octet-stream",
            isPublic: false,
          },
        ])
      );
      mockDbInsert.mockReturnValue({
        values: mock((v: any) => ({ returning: returningMock })),
      } as any);

      await storageService.upload(fileBuffer, {
        organizationId: "org-1",
        uploadedBy: "user-1",
        name: "my file/name?.txt",
      });

      // Spaces, slashes, and question marks should be replaced
      const keyParts = capturedInput.Key.split("/");
      const fileName = keyParts[keyParts.length - 1];
      expect(fileName).not.toContain(" ");
      expect(fileName).not.toContain("?");
      // Only safe chars: [a-zA-Z0-9._-]
      expect(fileName).toMatch(/^[a-zA-Z0-9._-]+$/);
    });

    it("truncates filenames longer than 255 characters", async () => {
      const fileBuffer = Buffer.from("data");
      let capturedInput: any = null;
      mockS3Send.mockImplementation((cmd: any) => {
        capturedInput = cmd.input;
        return Promise.resolve({});
      });

      const longName = "a".repeat(300) + ".txt";
      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-3",
            organizationId: "org-1",
            name: longName,
            key: "org-1/cuid_1/truncated",
            bucket: "bunship-files",
            size: 4,
            mimeType: "application/octet-stream",
            isPublic: false,
          },
        ])
      );
      mockDbInsert.mockReturnValue({
        values: mock((v: any) => ({ returning: returningMock })),
      } as any);

      await storageService.upload(fileBuffer, {
        organizationId: "org-1",
        uploadedBy: "user-1",
        name: longName,
      });

      const keyParts = capturedInput.Key.split("/");
      const fileName = keyParts[keyParts.length - 1];
      expect(fileName.length).toBeLessThanOrEqual(255);
    });
  });

  // ── S3 key format ─────────────────────────────────────────────────────
  describe("S3 key format", () => {
    it("follows orgId/fileId/safeName pattern", async () => {
      const fileBuffer = Buffer.from("content");
      let capturedInput: any = null;
      mockS3Send.mockImplementation((cmd: any) => {
        capturedInput = cmd.input;
        return Promise.resolve({});
      });

      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-4",
            organizationId: "org-42",
            name: "report.pdf",
            key: "org-42/cuid_1/report.pdf",
            bucket: "bunship-files",
            size: 7,
            mimeType: "application/pdf",
            isPublic: false,
          },
        ])
      );
      mockDbInsert.mockReturnValue({
        values: mock((v: any) => ({ returning: returningMock })),
      } as any);

      await storageService.upload(fileBuffer, {
        organizationId: "org-42",
        uploadedBy: "user-1",
        name: "report.pdf",
      });

      const key = capturedInput.Key as string;
      expect(key).toStartWith("org-42/");
      // Should have 3 segments: orgId / cuid / filename
      const segments = key.split("/");
      expect(segments).toHaveLength(3);
      expect(segments[0]).toBe("org-42");
      expect(segments[2]).toBe("report.pdf");
    });
  });

  // ── File size limit enforcement ───────────────────────────────────────
  describe("file size limit", () => {
    it("rejects files exceeding the maximum allowed size", async () => {
      // Default MAX_FILE_SIZE is 52428800 (50 MB)
      // Create a buffer just over the limit
      const oversizedBuffer = Buffer.alloc(52428801);

      await expect(
        storageService.upload(oversizedBuffer, {
          organizationId: "org-1",
          uploadedBy: "user-1",
          name: "huge-file.bin",
        })
      ).rejects.toThrow("File size exceeds maximum allowed size");
    });

    it("rejects empty files (zero bytes)", async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(
        storageService.upload(emptyBuffer, {
          organizationId: "org-1",
          uploadedBy: "user-1",
          name: "empty.txt",
        })
      ).rejects.toThrow("File is empty");
    });

    it("accepts files within the size limit", async () => {
      const validBuffer = Buffer.alloc(1024); // 1 KB
      mockS3Send.mockResolvedValue({});

      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-5",
            organizationId: "org-1",
            name: "small.txt",
            key: "org-1/cuid_1/small.txt",
            bucket: "bunship-files",
            size: 1024,
            mimeType: "text/plain",
            isPublic: false,
          },
        ])
      );
      mockDbInsert.mockReturnValue({
        values: mock((v: any) => ({ returning: returningMock })),
      } as any);

      const result = await storageService.upload(validBuffer, {
        organizationId: "org-1",
        uploadedBy: "user-1",
        name: "small.txt",
        mimeType: "text/plain",
      });

      expect(result).toBeDefined();
      expect(result.id).toBe("file-5");
    });
  });

  // ── MIME type ─────────────────────────────────────────────────────────
  describe("MIME type handling", () => {
    it("defaults to application/octet-stream when no mimeType is provided", async () => {
      const fileBuffer = Buffer.from("binary");
      let capturedInput: any = null;
      mockS3Send.mockImplementation((cmd: any) => {
        capturedInput = cmd.input;
        return Promise.resolve({});
      });

      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-6",
            organizationId: "org-1",
            name: "file",
            key: "org-1/cuid_1/file",
            bucket: "bunship-files",
            size: 6,
            mimeType: "application/octet-stream",
            isPublic: false,
          },
        ])
      );
      mockDbInsert.mockReturnValue({
        values: mock((v: any) => ({ returning: returningMock })),
      } as any);

      await storageService.upload(fileBuffer, {
        organizationId: "org-1",
        uploadedBy: "user-1",
      });

      expect(capturedInput.ContentType).toBe("application/octet-stream");
    });

    it("uses the provided mimeType in the S3 upload", async () => {
      const fileBuffer = Buffer.from("<html></html>");
      let capturedInput: any = null;
      mockS3Send.mockImplementation((cmd: any) => {
        capturedInput = cmd.input;
        return Promise.resolve({});
      });

      const returningMock = mock(() =>
        Promise.resolve([
          {
            id: "file-7",
            organizationId: "org-1",
            name: "page.html",
            key: "org-1/cuid_1/page.html",
            bucket: "bunship-files",
            size: 13,
            mimeType: "text/html",
            isPublic: false,
          },
        ])
      );
      mockDbInsert.mockReturnValue({
        values: mock((v: any) => ({ returning: returningMock })),
      } as any);

      await storageService.upload(fileBuffer, {
        organizationId: "org-1",
        uploadedBy: "user-1",
        name: "page.html",
        mimeType: "text/html",
      });

      expect(capturedInput.ContentType).toBe("text/html");
    });
  });
});
