# Admin Routes

Admin routes provide superuser access to manage users, organizations, and system settings.

## Authentication

All admin routes require:

1. Valid JWT token (Bearer authentication)
2. User must have `isAdmin` flag set to `true` in the database

## Endpoints

### User Management

#### List All Users

```http
GET /api/v1/admin/users
```

Query parameters:

- `email` (optional): Filter by email
- `isActive` (optional): Filter by active status ("true" or "false")
- `isAdmin` (optional): Filter by admin status ("true" or "false")
- `search` (optional): Search by email or full name
- `page` (optional): Page number (default: 1)
- `limit` (optional): Results per page (default: 50, max: 100)

Response:

```json
{
  "data": [
    {
      "id": "user123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "isActive": true,
      "isAdmin": false,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 100,
    "totalPages": 2
  }
}
```

#### Get User Details

```http
GET /api/v1/admin/users/:id
```

#### Update User

```http
PATCH /api/v1/admin/users/:id
```

Body:

```json
{
  "fullName": "Updated Name",
  "isActive": false,
  "isAdmin": true,
  "emailVerified": "2024-01-01T00:00:00Z"
}
```

#### Delete User

```http
DELETE /api/v1/admin/users/:id
```

Soft deletes the user. Cannot delete admin users.

#### Impersonate User

```http
POST /api/v1/admin/users/:id/impersonate
```

Generates an access token for the specified user, allowing admin to impersonate them.

Response:

```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user123",
    "email": "user@example.com"
  }
}
```

### Organization Management

#### List All Organizations

```http
GET /api/v1/admin/organizations
```

Query parameters:

- `search` (optional): Search by name or slug
- `hasSubscription` (optional): Filter by subscription status
- `page` (optional): Page number
- `limit` (optional): Results per page

#### Get Organization Details

```http
GET /api/v1/admin/organizations/:id
```

### System Management

#### Get System Statistics

```http
GET /api/v1/admin/system/stats
```

Returns comprehensive system statistics:

```json
{
  "users": {
    "total": 1000,
    "active": 950,
    "admins": 5,
    "newThisMonth": 50
  },
  "organizations": {
    "total": 200,
    "withActiveSubscriptions": 150,
    "onTrial": 30,
    "newThisMonth": 10
  },
  "projects": {
    "total": 500,
    "activeThisMonth": 200
  }
}
```

#### Get Maintenance Mode Status

```http
GET /api/v1/admin/system/maintenance
```

#### Toggle Maintenance Mode

```http
POST /api/v1/admin/system/maintenance
```

Body:

```json
{
  "enabled": true
}
```

## Security Considerations

1. **Admin Access**: Only users with `isAdmin: true` can access these routes
2. **Audit Logging**: All admin actions should be logged (TODO)
3. **Rate Limiting**: Consider implementing stricter rate limits for admin endpoints
4. **Impersonation**: Log all impersonation events for security audits

## Error Responses

### 401 Unauthorized

```json
{
  "error": {
    "name": "AuthenticationError",
    "message": "Authentication required",
    "code": "AUTHENTICATION_ERROR",
    "statusCode": 401
  }
}
```

### 403 Forbidden

```json
{
  "error": {
    "name": "AuthorizationError",
    "message": "Admin access required",
    "code": "AUTHORIZATION_ERROR",
    "statusCode": 403
  }
}
```

### 404 Not Found

```json
{
  "error": {
    "name": "NotFoundError",
    "message": "User not found",
    "code": "NOT_FOUND",
    "statusCode": 404
  }
}
```

### 400 Bad Request

```json
{
  "error": {
    "name": "ValidationError",
    "message": "Cannot delete admin users",
    "code": "VALIDATION_ERROR",
    "statusCode": 400
  }
}
```
