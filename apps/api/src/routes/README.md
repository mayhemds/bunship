# BunShip API Routes

This document provides an overview of the implemented API routes for user and organization management.

## User Routes (`/api/v1/users`)

All user routes require authentication via Bearer token.

### GET `/users/me`

Get the current authenticated user's profile.

**Response:**

```json
{
  "id": "cuid...",
  "email": "user@example.com",
  "emailVerified": "2024-01-01T00:00:00Z",
  "fullName": "John Doe",
  "avatarUrl": "https://example.com/avatar.jpg",
  "preferences": {
    "theme": "dark",
    "language": "en",
    "timezone": "America/New_York",
    "notifications": {
      "email": true,
      "push": false
    }
  },
  "twoFactorEnabled": false,
  "isActive": true,
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

### PATCH `/users/me`

Update the current user's profile.

**Request Body:**

```json
{
  "fullName": "Jane Doe",
  "avatarUrl": "https://example.com/new-avatar.jpg",
  "preferences": {
    "theme": "light",
    "notifications": {
      "email": false
    }
  }
}
```

### PUT `/users/me/password`

Change the current user's password.

**Request Body:**

```json
{
  "currentPassword": "oldPassword123",
  "newPassword": "newPassword456"
}
```

**Password Requirements:**

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number

### DELETE `/users/me`

Delete the current user's account (soft delete).

**Note:** Cannot delete if the user owns any organizations. Transfer ownership first.

### GET `/users/me/sessions`

List all active sessions for the current user.

**Response:**

```json
{
  "sessions": [
    {
      "id": "session_id",
      "userAgent": "Mozilla/5.0...",
      "ipAddress": "192.168.1.1",
      "lastUsedAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-01-08T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "isCurrent": true
    }
  ],
  "total": 1
}
```

### DELETE `/users/me/sessions/:sessionId`

Revoke a specific session.

**Note:** Cannot revoke the current session. Use logout endpoint instead.

### GET `/users/me/organizations`

List all organizations the user is a member of.

**Response:**

```json
{
  "organizations": [
    {
      "id": "org_id",
      "name": "My Organization",
      "slug": "my-org",
      "logoUrl": "https://example.com/logo.jpg",
      "role": "owner",
      "membershipId": "membership_id",
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

## Organization Routes (`/api/v1/organizations`)

### POST `/organizations`

Create a new organization. The creator becomes the owner.

**Request Body:**

```json
{
  "name": "My Organization",
  "slug": "my-org",
  "description": "Optional description",
  "logoUrl": "https://example.com/logo.jpg"
}
```

**Slug Requirements:**

- 3-50 characters
- Lowercase letters, numbers, and hyphens only
- Must start and end with alphanumeric character
- Must be unique across all organizations

### GET `/organizations`

List all organizations the user is a member of.

### GET `/organizations/:orgId`

Get details of a specific organization.

**Requires:** Membership in the organization

### PATCH `/organizations/:orgId`

Update organization details.

**Requires:** `org:update` permission (Admin or Owner)

**Request Body:**

```json
{
  "name": "Updated Name",
  "description": "Updated description",
  "logoUrl": "https://example.com/new-logo.jpg",
  "settings": {
    "branding": {
      "primaryColor": "#3B82F6",
      "accentColor": "#10B981"
    },
    "features": {
      "webhooks": true,
      "apiAccess": true,
      "customDomain": false
    },
    "billing": {
      "email": "billing@example.com",
      "taxId": "123-45-6789"
    }
  }
}
```

### DELETE `/organizations/:orgId`

Delete an organization (soft delete).

**Requires:** Owner role only

## Member Management Routes (`/api/v1/organizations/:orgId/members`)

### GET `/organizations/:orgId/members`

List all members of the organization.

**Requires:** `members:read` permission

**Response:**

```json
{
  "members": [
    {
      "id": "membership_id",
      "userId": "user_id",
      "organizationId": "org_id",
      "role": "owner",
      "user": {
        "id": "user_id",
        "email": "user@example.com",
        "fullName": "John Doe",
        "avatarUrl": "https://example.com/avatar.jpg"
      },
      "joinedAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 1
}
```

### PATCH `/organizations/:orgId/members/:memberId`

Update a member's role.

**Requires:** `members:update` permission

**Request Body:**

```json
{
  "role": "admin"
}
```

**Available Roles:**

- `admin` - Full management access except ownership transfer
- `member` - Can view org and manage projects
- `viewer` - Read-only access

**Restrictions:**

- Cannot change owner role (use ownership transfer instead)
- Cannot change your own role

### DELETE `/organizations/:orgId/members/:memberId`

Remove a member from the organization.

**Requires:** `members:remove` permission

**Restrictions:**

- Cannot remove the owner
- Cannot remove yourself (use leave organization instead)

## Invitation Management Routes (`/api/v1/organizations/:orgId/invitations`)

### GET `/organizations/:orgId/invitations`

List all pending invitations for the organization.

**Requires:** `invitations:read` permission

**Response:**

```json
{
  "invitations": [
    {
      "id": "invitation_id",
      "organizationId": "org_id",
      "email": "newuser@example.com",
      "role": "member",
      "invitedBy": {
        "id": "user_id",
        "email": "admin@example.com",
        "fullName": "Admin User"
      },
      "expiresAt": "2024-01-08T00:00:00Z",
      "createdAt": "2024-01-01T00:00:00Z",
      "status": "pending"
    }
  ],
  "total": 1
}
```

**Status Values:**

- `pending` - Not yet accepted
- `accepted` - Accepted by user
- `expired` - Invitation expired (7 days)

### POST `/organizations/:orgId/invitations`

Send an invitation to join the organization.

**Requires:** `invitations:create` permission

**Request Body:**

```json
{
  "email": "newuser@example.com",
  "role": "member"
}
```

**Response:**

```json
{
  "invitation": {
    /* invitation object */
  },
  "inviteUrl": "https://app.example.com/invite/token_here"
}
```

**Restrictions:**

- Cannot invite existing members
- Cannot invite if pending invitation exists for email
- Invitations expire after 7 days

### DELETE `/organizations/:orgId/invitations/:invitationId`

Cancel a pending invitation.

**Requires:** `invitations:delete` permission

**Restrictions:**

- Cannot cancel accepted invitations

### POST `/invitations/:token/accept`

Accept an invitation (public endpoint).

**Requires:** Valid invitation token and authentication

**Restrictions:**

- User's email must match invitation email
- Invitation must not be expired
- User must not already be a member

## Role-Based Permissions

### Owner

- Full control over the organization
- Can transfer ownership
- Can delete organization
- Has all permissions (wildcard `*`)

### Admin

- Manage members and invitations
- Manage projects, webhooks, and API keys
- Update organization settings
- View audit logs
- Cannot delete organization or transfer ownership

### Member

- View organization details
- View members
- Manage projects
- Cannot manage members or organization settings

### Viewer

- View organization details
- View members
- View projects (read-only)
- Cannot make any changes

## Error Handling

All endpoints return standard error responses:

```json
{
  "error": {
    "name": "ValidationError",
    "message": "Email is required",
    "code": "VALIDATION_ERROR",
    "statusCode": 400,
    "details": {
      "field": "email"
    }
  }
}
```

**Common Status Codes:**

- `400` - Validation error or bad request
- `401` - Authentication required or invalid token
- `403` - Insufficient permissions
- `404` - Resource not found
- `409` - Conflict (duplicate slug, existing member, etc.)
- `500` - Internal server error

## Authentication

All endpoints (except invitation acceptance) require a JWT Bearer token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 15 minutes. Use the refresh token flow to obtain new access tokens.

## OpenAPI Documentation

Interactive API documentation is available at `/docs` when running the API server.
