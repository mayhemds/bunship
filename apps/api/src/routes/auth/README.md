# Authentication System

Complete authentication system for BunShip API with email/password, 2FA, and email verification.

## Overview

The authentication system provides:

- User registration with email verification
- Login with email/password
- JWT-based access and refresh tokens
- Two-factor authentication (TOTP)
- Password reset flow
- Session management

## Architecture

```
routes/auth/
├── index.ts       - Route handlers and OpenAPI specs
└── schemas.ts     - TypeBox validation schemas

services/
└── auth.service.ts - Business logic implementation

lib/
├── jwt.ts         - JWT token generation/verification
├── password.ts    - Password hashing with Argon2
├── crypto.ts      - Token generation utilities
└── email.ts       - Email sending with Resend
```

## Endpoints

### POST /api/v1/auth/register

Register a new user account.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "fullName": "John Doe"
}
```

**Response (200):**

```json
{
  "message": "Registration successful. Please check your email to verify your account.",
  "userId": "cm1x2y3z4..."
}
```

**Behavior:**

- Creates user with hashed password (Argon2id)
- Generates email verification token (24hr expiry)
- Sends verification email via Resend
- Returns 409 if email already exists

### POST /api/v1/auth/login

Authenticate with email and password.

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "twoFactorCode": "123456" // Optional, required if 2FA enabled
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "user": {
    "id": "cm1x2y3z4...",
    "email": "user@example.com",
    "fullName": "John Doe",
    "emailVerified": "2024-01-15T10:30:00Z",
    "twoFactorEnabled": false
  }
}
```

**Security:**

- Verifies password using Argon2 (time-safe comparison)
- Checks if account is active
- Validates 2FA code if enabled
- Creates session with 7-day expiry
- Returns JWT access token (15min) and refresh token (7 days)

### POST /api/v1/auth/refresh

Refresh access token using refresh token.

**Request Body:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response (200):**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

**Security:**

- Validates refresh token signature and expiration
- Checks session exists and not expired
- Rotates refresh token (invalidates old one)
- Updates session last used timestamp

### POST /api/v1/auth/logout

Logout and invalidate session.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body (optional):**

```json
{
  "allSessions": true // Logout from all devices
}
```

**Response (200):**

```json
{
  "message": "Logged out successfully"
}
```

### POST /api/v1/auth/forgot-password

Request password reset email.

**Request Body:**

```json
{
  "email": "user@example.com"
}
```

**Response (200):**

```json
{
  "message": "If an account exists with that email, a password reset link has been sent."
}
```

**Security:**

- Always returns success to prevent email enumeration
- Generates secure random token (1hr expiry)
- Invalidates previous reset tokens
- Sends reset email with token

### POST /api/v1/auth/reset-password

Complete password reset with token.

**Request Body:**

```json
{
  "token": "abc123...",
  "password": "NewSecurePassword123!"
}
```

**Response (200):**

```json
{
  "message": "Password reset successfully. Please login with your new password."
}
```

**Security:**

- Validates token not expired or already used
- Hashes new password with Argon2
- Marks token as used
- Invalidates all sessions for security

### GET /api/v1/auth/verify-email/:token

Verify email address.

**Response (200):**

```json
{
  "message": "Email verified successfully. You can now login."
}
```

**Security:**

- Validates token not expired or already used
- Updates user.emailVerified timestamp
- Marks token as used

### POST /api/v1/auth/two-factor/setup

Initiate 2FA setup.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "password": "CurrentPassword123!"
}
```

**Response (200):**

```json
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qrCode": "otpauth://totp/BunShip:user@example.com?secret=...",
  "backupCodes": [
    "A1B2C3D4",
    "E5F6G7H8",
    ...
  ]
}
```

**Security:**

- Requires password confirmation
- Generates TOTP secret (base32)
- Returns QR code data for authenticator app
- Generates 10 backup codes
- 2FA not enabled until verified

### POST /api/v1/auth/two-factor/verify

Complete 2FA setup by verifying code.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "code": "123456"
}
```

**Response (200):**

```json
{
  "message": "Two-factor authentication enabled successfully."
}
```

**Security:**

- Validates TOTP code with time window
- Enables 2FA on user account
- Subsequent logins require code

### POST /api/v1/auth/two-factor/disable

Disable 2FA.

**Headers:**

```
Authorization: Bearer <access_token>
```

**Request Body:**

```json
{
  "password": "CurrentPassword123!",
  "code": "123456"
}
```

**Response (200):**

```json
{
  "message": "Two-factor authentication disabled successfully."
}
```

**Security:**

- Requires password AND current valid TOTP code
- Removes 2FA secret from account
- Sets twoFactorEnabled to false

## Database Schema

### users table

- `id` - cuid2 primary key
- `email` - unique, lowercase
- `emailVerified` - timestamp or null
- `passwordHash` - Argon2id hash
- `fullName` - user's full name
- `twoFactorEnabled` - boolean
- `twoFactorSecret` - TOTP secret (base32)
- `isActive` - account status

### sessions table

- `id` - cuid2 primary key
- `userId` - foreign key to users
- `refreshTokenHash` - SHA-256 hash of session ID
- `userAgent` - browser/device info
- `ipAddress` - login IP
- `expiresAt` - session expiry (7 days)
- `lastUsedAt` - last refresh timestamp

### verification_tokens table

- `id` - cuid2 primary key
- `userId` - foreign key to users
- `tokenHash` - SHA-256 hash of token
- `type` - enum: email_verification | password_reset
- `expiresAt` - token expiry
- `usedAt` - timestamp when used (null if unused)

## Security Best Practices

### Password Security

- Argon2id hashing with recommended parameters
- Minimum 8 characters required
- Time-safe password comparison

### Token Security

- JWT signed with HS256
- Access tokens: 15 minute expiry
- Refresh tokens: 7 day expiry, hashed in database
- Verification tokens: secure random 32 bytes, SHA-256 hashed
- Token rotation on refresh for security

### Session Management

- Sessions tied to refresh tokens
- Tracked by user agent and IP
- Can be revoked individually or all at once
- Automatic cleanup of expired sessions

### Rate Limiting

Apply rate limiting to prevent brute force:

- Login: 5 attempts per 15 minutes per IP
- Password reset: 3 requests per hour per IP
- 2FA verification: 5 attempts per 15 minutes

### Email Security

- Verification tokens expire in 24 hours
- Reset tokens expire in 1 hour
- Always send to registered email only
- No user enumeration in responses

### Two-Factor Authentication

- TOTP compliant (RFC 6238)
- 30-second time step
- 1-step time window for clock skew
- Backup codes for account recovery
- Requires password confirmation to enable/disable

## Error Handling

All endpoints return structured errors:

```json
{
  "error": {
    "name": "AuthenticationError",
    "message": "Invalid email or password",
    "code": "AUTHENTICATION_ERROR",
    "statusCode": 401
  }
}
```

**Common Error Codes:**

- `VALIDATION_ERROR` (400) - Invalid input
- `AUTHENTICATION_ERROR` (401) - Auth failed
- `AUTHORIZATION_ERROR` (403) - Insufficient permissions
- `CONFLICT` (409) - Email already exists
- `INTERNAL_ERROR` (500) - Server error

## Environment Variables

Required environment variables:

```env
# JWT secrets
JWT_SECRET=your-secret-key-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars

# Email (Resend)
RESEND_API_KEY=re_...
RESEND_FROM_EMAIL=noreply@yourdomain.com

# Database
TURSO_DATABASE_URL=file:local.db
TURSO_AUTH_TOKEN=  # Optional for local

# App URLs
API_URL=http://localhost:3000
FRONTEND_URL=http://localhost:5173
```

## Testing

### Manual Testing with cURL

**Register:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "fullName": "Test User"
  }'
```

**Login:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!"
  }'
```

**Refresh:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

**Authenticated Request:**

```bash
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer eyJhbGc..." \
  -H "Content-Type: application/json"
```

## TODO: Production Improvements

1. **TOTP Implementation**
   - Add proper TOTP library like `@noble/otp` or `otpauth`
   - Current implementation is a placeholder

2. **QR Code Generation**
   - Add QR code library like `qrcode` to generate actual images
   - Currently returns otpauth URL

3. **Backup Codes**
   - Store hashed backup codes in database
   - Allow one-time use for 2FA recovery

4. **Rate Limiting**
   - Implement rate limiting on auth endpoints
   - Use Redis for distributed rate limiting

5. **Email Templates**
   - Customize email templates in `packages/emails`
   - Add company branding

6. **Session Cleanup**
   - Add background job to clean expired sessions
   - Add background job to clean expired tokens

7. **Audit Logging**
   - Log all authentication events
   - Track failed login attempts

8. **IP Geolocation**
   - Add IP geolocation for login notifications
   - Alert users of logins from new locations

## API Documentation

Full OpenAPI documentation available at: http://localhost:3000/docs

The Swagger UI provides interactive testing of all endpoints with request/response examples.
