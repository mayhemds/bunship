# BunShip API Features

This document describes the newly implemented features for audit logging, background jobs, and file uploads.

## Table of Contents

1. [Audit Logging](#audit-logging)
2. [Background Jobs](#background-jobs)
3. [File Uploads](#file-uploads)
4. [Environment Variables](#environment-variables)

---

## Audit Logging

Complete audit trail for all organization actions with comprehensive filtering and querying capabilities.

### Features

- Multi-tenant isolation (automatically filtered by organization)
- Tracks actor (user, API key, or system)
- Records old and new values for updates
- Captures IP address and user agent
- Custom metadata support
- Indexed for fast queries

### API Endpoints

#### List Audit Logs

```http
GET /api/v1/organizations/:orgId/audit-logs
```

**Query Parameters:**

- `actorId` - Filter by actor ID
- `actorType` - Filter by actor type (user, api_key, system)
- `action` - Filter by action (e.g., "organization.updated")
- `resourceType` - Filter by resource type (e.g., "organization")
- `resourceId` - Filter by resource ID
- `startDate` - Filter by start date (ISO 8601)
- `endDate` - Filter by end date (ISO 8601)
- `limit` - Number of logs to return (1-100, default: 50)
- `offset` - Number of logs to skip (default: 0)

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/audit-logs?action=file.uploaded&limit=20"
```

#### Get Audit Log Details

```http
GET /api/v1/organizations/:orgId/audit-logs/:id
```

### Usage in Code

```typescript
import { auditService } from "./services/audit.service";

// Log user action
await auditService.logUserAction({
  organizationId: "org_123",
  userId: "user_123",
  userEmail: "user@example.com",
  action: "organization.updated",
  resourceType: "organization",
  resourceId: "org_123",
  oldValues: { name: "Old Name" },
  newValues: { name: "New Name" },
  ipAddress: req.ip,
  userAgent: req.headers["user-agent"],
});

// Log API key action
await auditService.logApiKeyAction({
  organizationId: "org_123",
  apiKeyId: "key_123",
  action: "project.created",
  resourceType: "project",
  resourceId: "proj_123",
  ipAddress: req.ip,
});

// Log system action
await auditService.logSystemAction({
  organizationId: "org_123",
  action: "subscription.renewed",
  resourceType: "subscription",
  resourceId: "sub_123",
});
```

---

## Background Jobs

BullMQ-powered background job processing with Redis for queues and workers.

### Features

- **Email Queue** - Send transactional emails via Resend
- **Webhook Queue** - Dispatch webhooks with retries and exponential backoff
- **Cleanup Queue** - Periodic maintenance tasks

### Queues

#### Email Queue

- Concurrency: 5
- Rate limit: 50 emails per second
- Retry: 3 attempts with exponential backoff

```typescript
import { addEmailJob } from "./jobs/queue";

await addEmailJob({
  to: "user@example.com",
  subject: "Welcome to BunShip",
  html: "<h1>Welcome!</h1>",
  text: "Welcome!",
});
```

#### Webhook Queue

- Concurrency: 10
- Rate limit: 100 webhooks per second
- Retry: 5 attempts with exponential backoff
- HMAC signature verification

```typescript
import { addWebhookJob } from "./jobs/queue";

await addWebhookJob({
  webhookId: "webhook_123",
  deliveryId: "delivery_123",
  url: "https://example.com/webhook",
  secret: "webhook_secret",
  event: "organization.updated",
  payload: { id: "org_123", name: "New Name" },
  attempt: 1,
});
```

#### Cleanup Queue

- Runs periodic maintenance tasks
- Tasks: expired tokens, old audit logs, failed deliveries, temporary files

```typescript
import { addCleanupJob } from "./jobs/queue";

// One-time cleanup
await addCleanupJob({
  task: "old-audit-logs",
  daysToKeep: 90,
});

// Recurring cleanup (cron)
await addCleanupJob(
  { task: "expired-tokens" },
  { repeat: { cron: "0 2 * * *" } } // Daily at 2 AM
);
```

### Running Workers

Workers should run in a separate process from the API server:

```bash
# Development
bun run dev:worker

# Production
bun run start:worker
```

Or use the API directly:

```typescript
import { startWorkers, setupRecurringJobs } from "./jobs";

await startWorkers();
await setupRecurringJobs();
```

### Monitoring

Use BullMQ UI or Bull Board for monitoring queues:

```bash
npm install -g bull-board
bull-board
```

---

## File Uploads

S3-compatible file storage with presigned URLs and access control.

### Features

- S3-compatible storage (AWS S3, MinIO, Cloudflare R2, etc.)
- Presigned URLs for secure downloads
- File size limits (configurable, default: 50 MB)
- Public/private files
- Temporary files with expiration
- Soft delete support
- MIME type filtering
- Custom metadata

### API Endpoints

#### Upload File

```http
POST /api/v1/organizations/:orgId/files
Content-Type: multipart/form-data
```

**Body:**

- `file` (required) - File to upload
- `name` (optional) - Custom file name
- `isPublic` (optional) - Whether file is publicly accessible (default: false)
- `expiresIn` (optional) - Expiration time in seconds (60-604800)
- `metadata` (optional) - Custom metadata object

**Example:**

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@document.pdf" \
  -F "name=my-document.pdf" \
  -F "isPublic=false" \
  "http://localhost:3000/api/v1/organizations/org_123/files"
```

#### List Files

```http
GET /api/v1/organizations/:orgId/files
```

**Query Parameters:**

- `limit` - Number of files (1-100, default: 50)
- `offset` - Number to skip (default: 0)
- `mimeType` - Filter by MIME type prefix (e.g., "image/")
- `includeDeleted` - Include soft-deleted files (default: false)

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/files?mimeType=image/"
```

#### Get File Metadata

```http
GET /api/v1/organizations/:orgId/files/:id
```

#### Get Download URL

```http
GET /api/v1/organizations/:orgId/files/:id/download
```

**Query Parameters:**

- `expiresIn` - URL expiration in seconds (60-86400, default: 3600)

**Example:**

```bash
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/files/file_123/download?expiresIn=1800"
```

**Response:**

```json
{
  "success": true,
  "data": {
    "url": "https://s3.amazonaws.com/bucket/key?signature=...",
    "expiresIn": 1800,
    "expiresAt": "2024-01-28T12:30:00.000Z"
  }
}
```

#### Delete File

```http
DELETE /api/v1/organizations/:orgId/files/:id
```

**Query Parameters:**

- `hard` - Permanently delete (default: false, soft delete)

**Example:**

```bash
# Soft delete
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/files/file_123"

# Hard delete (permanent)
curl -X DELETE \
  -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/files/file_123?hard=true"
```

### Usage in Code

```typescript
import { storageService } from "./services/storage.service";

// Upload file
const file = await storageService.upload(buffer, {
  organizationId: "org_123",
  uploadedBy: "user_123",
  name: "document.pdf",
  mimeType: "application/pdf",
  isPublic: false,
  metadata: { category: "invoices" },
});

// Get signed URL
const { url } = await storageService.getSignedUrl("file_123", 3600);

// List files
const { files } = await storageService.list("org_123", {
  limit: 50,
  mimeType: "image/",
});

// Delete file
await storageService.delete("file_123", "org_123", false);
```

---

## Environment Variables

Add these environment variables to your `.env` file:

### Redis (Required for Background Jobs)

```env
REDIS_URL=redis://localhost:6379
```

### S3 Storage (Required for File Uploads)

```env
# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=bunship-files

# S3-Compatible (MinIO, R2, etc.)
S3_ENDPOINT=https://s3.example.com
S3_FORCE_PATH_STYLE=true

# File upload limits
MAX_FILE_SIZE=52428800  # 50 MB in bytes
```

### Resend (Required for Email Queue)

```env
RESEND_API_KEY=re_xxxxxxxxxxxx
```

### Database (Already configured)

```env
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=
```

---

## Database Migrations

After implementing these features, run database migrations to create the new tables:

```bash
cd packages/database
bun run db:generate
bun run db:push
```

This will create:

- `audit_logs` table
- `files` table
- Update existing schemas with relations

---

## Testing

### Test Audit Logging

```bash
# Create an organization and check audit logs
curl -X POST -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Org","slug":"test-org"}' \
  "http://localhost:3000/api/v1/organizations"

# View audit logs
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/audit-logs"
```

### Test Background Jobs

```bash
# Start worker process
bun run dev:worker

# Trigger email job (in your code)
await addEmailJob({
  to: "test@example.com",
  subject: "Test Email",
  html: "<p>Test</p>",
});
```

### Test File Uploads

```bash
# Upload a file
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -F "file=@test.pdf" \
  "http://localhost:3000/api/v1/organizations/org_123/files"

# Get download URL
curl -H "Authorization: Bearer <token>" \
  "http://localhost:3000/api/v1/organizations/org_123/files/file_123/download"
```

---

## Architecture Notes

### Audit Logging

- All audit logs are automatically scoped to organizations
- Indexed for fast queries on common fields
- Old values and new values stored as JSON for flexibility
- IP address and user agent captured for security

### Background Jobs

- Workers run separately from API server for scalability
- Redis stores job queue state
- Automatic retries with exponential backoff
- Failed jobs retained for debugging (7 days)
- Completed jobs retained (24 hours, last 100)

### File Storage

- Files isolated by organization using S3 key prefix
- Presigned URLs for secure access without exposing credentials
- Soft delete by default, hard delete optional
- File metadata stored in database, actual files in S3
- Support for temporary files with automatic expiration

---

## Security Considerations

### Audit Logging

- Sensitive data (passwords, tokens) should never be logged
- Use `metadata` field for additional context, not for PII
- Audit logs should be immutable (no updates, only inserts)

### Background Jobs

- Webhook signatures use HMAC-SHA256
- Email queue respects rate limits
- Workers should run with minimal permissions

### File Storage

- Files scoped to organizations
- Presigned URLs expire (default: 1 hour)
- Public files should be carefully controlled
- File size limits enforced to prevent abuse
- MIME type validation recommended for security

---

## Troubleshooting

### Redis Connection Issues

```bash
# Check Redis is running
redis-cli ping

# Check connection string
echo $REDIS_URL
```

### S3 Connection Issues

```bash
# Test S3 credentials
aws s3 ls s3://your-bucket --region us-east-1

# For S3-compatible services
aws s3 ls s3://your-bucket --endpoint-url https://s3.example.com
```

### Worker Not Processing Jobs

```bash
# Check worker logs
bun run start:worker

# Check Redis queue status
redis-cli
> KEYS bull:*
> LLEN bull:email:wait
```

---

## Future Enhancements

- [ ] File upload progress tracking
- [ ] Image thumbnail generation
- [ ] Virus scanning integration
- [ ] Audit log export (CSV, JSON)
- [ ] Webhook replay functionality
- [ ] Dead letter queue for failed jobs
- [ ] File versioning
- [ ] Bulk file operations
