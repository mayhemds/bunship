/**
 * User route schemas
 * TypeBox schemas for user management endpoints
 */
import { Type, Static } from "@sinclair/typebox";

/**
 * User response schema
 */
export const UserSchema = Type.Object({
  id: Type.String(),
  email: Type.String({ format: "email" }),
  emailVerified: Type.Union([Type.String({ format: "date-time" }), Type.Null()]),
  fullName: Type.Union([Type.String(), Type.Null()]),
  avatarUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  preferences: Type.Object({
    theme: Type.Optional(
      Type.Union([Type.Literal("light"), Type.Literal("dark"), Type.Literal("system")])
    ),
    language: Type.Optional(Type.String()),
    timezone: Type.Optional(Type.String()),
    notifications: Type.Optional(
      Type.Object({
        email: Type.Optional(Type.Boolean()),
        push: Type.Optional(Type.Boolean()),
      })
    ),
  }),
  twoFactorEnabled: Type.Boolean(),
  isActive: Type.Boolean(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export type UserResponse = Static<typeof UserSchema>;

/**
 * Update profile schema
 */
export const UpdateProfileSchema = Type.Object({
  fullName: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  avatarUrl: Type.Optional(Type.Union([Type.String({ format: "uri" }), Type.Null()])),
  preferences: Type.Optional(
    Type.Object({
      theme: Type.Optional(
        Type.Union([Type.Literal("light"), Type.Literal("dark"), Type.Literal("system")])
      ),
      language: Type.Optional(Type.String({ minLength: 2, maxLength: 10 })),
      timezone: Type.Optional(Type.String({ minLength: 1, maxLength: 50 })),
      notifications: Type.Optional(
        Type.Object({
          email: Type.Optional(Type.Boolean()),
          push: Type.Optional(Type.Boolean()),
        })
      ),
    })
  ),
});

export type UpdateProfileBody = Static<typeof UpdateProfileSchema>;

/**
 * Change password schema
 */
export const ChangePasswordSchema = Type.Object({
  currentPassword: Type.String({ minLength: 8, maxLength: 128 }),
  newPassword: Type.String({ minLength: 8, maxLength: 128 }),
});

export type ChangePasswordBody = Static<typeof ChangePasswordSchema>;

/**
 * Session response schema
 */
export const SessionSchema = Type.Object({
  id: Type.String(),
  userAgent: Type.Union([Type.String(), Type.Null()]),
  ipAddress: Type.Union([Type.String(), Type.Null()]),
  lastUsedAt: Type.String({ format: "date-time" }),
  expiresAt: Type.String({ format: "date-time" }),
  createdAt: Type.String({ format: "date-time" }),
  isCurrent: Type.Boolean(),
});

export type SessionResponse = Static<typeof SessionSchema>;

/**
 * Organization membership schema (simplified for user context)
 */
export const UserOrganizationSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  logoUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  role: Type.Union([
    Type.Literal("owner"),
    Type.Literal("admin"),
    Type.Literal("member"),
    Type.Literal("viewer"),
  ]),
  membershipId: Type.String(),
  joinedAt: Type.String({ format: "date-time" }),
});

export type UserOrganization = Static<typeof UserOrganizationSchema>;

/**
 * Common response schemas
 */
export const MessageSchema = Type.Object({
  message: Type.String(),
});

export const SessionsListSchema = Type.Object({
  sessions: Type.Array(SessionSchema),
  total: Type.Integer(),
});

export const OrganizationsListSchema = Type.Object({
  organizations: Type.Array(UserOrganizationSchema),
  total: Type.Integer(),
});

export const ErrorSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.String()),
  }),
});
