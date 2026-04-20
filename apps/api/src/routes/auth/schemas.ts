/**
 * TypeBox schemas for authentication endpoints
 * Provides compile-time validation and OpenAPI documentation
 */
import { t } from "elysia";

/**
 * Register schema - Create new user account
 */
export const RegisterSchema = t.Object({
  email: t.String({
    format: "email",
    minLength: 5,
    maxLength: 255,
    description: "User email address",
    examples: ["user@example.com"],
  }),
  password: t.String({
    minLength: 8,
    maxLength: 128,
    description: "Password (minimum 8 characters)",
    examples: ["SecureP@ssw0rd"],
  }),
  fullName: t.String({
    minLength: 1,
    maxLength: 255,
    description: "User's full name",
    examples: ["John Doe"],
  }),
});

/**
 * Login schema - Authenticate user
 */
export const LoginSchema = t.Object({
  email: t.String({
    format: "email",
    description: "User email address",
    examples: ["user@example.com"],
  }),
  password: t.String({
    description: "User password",
  }),
  twoFactorCode: t.Optional(
    t.String({
      minLength: 6,
      maxLength: 6,
      pattern: "^[0-9]{6}$",
      description: "Two-factor authentication code (if enabled)",
      examples: ["123456"],
    })
  ),
});

/**
 * Refresh token schema - Rotate refresh token
 */
export const RefreshSchema = t.Object({
  refreshToken: t.String({
    description: "Refresh token from login response",
  }),
});

/**
 * Forgot password schema - Request password reset
 */
export const ForgotPasswordSchema = t.Object({
  email: t.String({
    format: "email",
    description: "Email address to send reset link",
    examples: ["user@example.com"],
  }),
});

/**
 * Reset password schema - Complete password reset
 */
export const ResetPasswordSchema = t.Object({
  token: t.String({
    description: "Password reset token from email",
  }),
  password: t.String({
    minLength: 8,
    maxLength: 128,
    description: "New password (minimum 8 characters)",
    examples: ["NewSecureP@ssw0rd"],
  }),
});

/**
 * Verify email params schema
 */
export const VerifyEmailParamsSchema = t.Object({
  token: t.String({
    description: "Email verification token from email",
  }),
});

/**
 * Two-factor setup schema - Initiate 2FA setup
 */
export const TwoFactorSetupSchema = t.Object({
  password: t.String({
    description: "Current password to confirm identity",
  }),
});

/**
 * Two-factor verify schema - Complete 2FA setup
 */
export const TwoFactorVerifySchema = t.Object({
  code: t.String({
    minLength: 6,
    maxLength: 6,
    pattern: "^[0-9]{6}$",
    description: "6-digit code from authenticator app",
    examples: ["123456"],
  }),
});

/**
 * Two-factor disable schema - Disable 2FA
 */
export const TwoFactorDisableSchema = t.Object({
  password: t.String({
    description: "Current password to confirm identity",
  }),
  code: t.String({
    minLength: 6,
    maxLength: 6,
    pattern: "^[0-9]{6}$",
    description: "Current 6-digit code from authenticator app",
    examples: ["123456"],
  }),
});

/**
 * Logout schema - Session ID in body (alternative to derive from token)
 */
export const LogoutSchema = t.Optional(
  t.Object({
    allSessions: t.Optional(
      t.Boolean({
        description: "Logout from all sessions",
        default: false,
      })
    ),
  })
);

/**
 * Response schemas
 */
export const AuthTokensResponse = t.Object({
  accessToken: t.String({ description: "JWT access token (15min expiry)" }),
  refreshToken: t.String({ description: "JWT refresh token (7 day expiry)" }),
  expiresIn: t.Number({ description: "Access token expiry in seconds" }),
  user: t.Optional(
    t.Object(
      {
        id: t.String(),
        email: t.String(),
        fullName: t.Nullable(t.String()),
        emailVerified: t.Nullable(t.Union([t.String(), t.Date()])),
        twoFactorEnabled: t.Boolean(),
      },
      { description: "User info (returned on login)" }
    )
  ),
});

export const TwoFactorSetupResponse = t.Object({
  secret: t.String({ description: "TOTP secret to configure authenticator app" }),
  qrCode: t.String({ description: "Data URL for QR code image" }),
  backupCodes: t.Array(t.String(), { description: "Backup codes for account recovery" }),
});

export const MessageResponse = t.Object({
  message: t.String({ description: "Response message" }),
  userId: t.Optional(t.String({ description: "Created user ID (registration only)" })),
});

export const ErrorResponse = t.Object({
  success: t.Boolean({ description: "Always false for errors" }),
  error: t.Object({
    code: t.String({ description: "Error code" }),
    message: t.String({ description: "Error message" }),
    details: t.Optional(t.String({ description: "Additional error details" })),
  }),
});
