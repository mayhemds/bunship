/**
 * Organization route schemas
 * TypeBox schemas for organization, member, and invitation management
 */
import { Type, Static } from "@sinclair/typebox";

/**
 * Organization response schema
 */
export const OrganizationSchema = Type.Object({
  id: Type.String(),
  name: Type.String(),
  slug: Type.String(),
  description: Type.Union([Type.String(), Type.Null()]),
  logoUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  settings: Type.Object({
    branding: Type.Optional(
      Type.Object({
        primaryColor: Type.Optional(Type.String()),
        accentColor: Type.Optional(Type.String()),
      })
    ),
    features: Type.Optional(
      Type.Object({
        webhooks: Type.Optional(Type.Boolean()),
        apiAccess: Type.Optional(Type.Boolean()),
        customDomain: Type.Optional(Type.Boolean()),
      })
    ),
    billing: Type.Optional(
      Type.Object({
        email: Type.Optional(Type.String({ format: "email" })),
        taxId: Type.Optional(Type.String()),
      })
    ),
  }),
  createdBy: Type.String(),
  createdAt: Type.String({ format: "date-time" }),
  updatedAt: Type.String({ format: "date-time" }),
});

export type OrganizationResponse = Static<typeof OrganizationSchema>;

/**
 * Create organization schema
 */
export const CreateOrganizationSchema = Type.Object({
  name: Type.String({ minLength: 1, maxLength: 100 }),
  slug: Type.String({
    minLength: 3,
    maxLength: 50,
    pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
  }),
  description: Type.Optional(Type.String({ maxLength: 500 })),
  logoUrl: Type.Optional(Type.String({ format: "uri" })),
});

export type CreateOrganizationBody = Static<typeof CreateOrganizationSchema>;

/**
 * Update organization schema
 */
export const UpdateOrganizationSchema = Type.Object({
  name: Type.Optional(Type.String({ minLength: 1, maxLength: 100 })),
  description: Type.Optional(Type.Union([Type.String({ maxLength: 500 }), Type.Null()])),
  logoUrl: Type.Optional(Type.Union([Type.String({ format: "uri" }), Type.Null()])),
  settings: Type.Optional(
    Type.Object({
      branding: Type.Optional(
        Type.Object({
          primaryColor: Type.Optional(Type.String()),
          accentColor: Type.Optional(Type.String()),
        })
      ),
      features: Type.Optional(
        Type.Object({
          webhooks: Type.Optional(Type.Boolean()),
          apiAccess: Type.Optional(Type.Boolean()),
          customDomain: Type.Optional(Type.Boolean()),
        })
      ),
      billing: Type.Optional(
        Type.Object({
          email: Type.Optional(Type.String({ format: "email" })),
          taxId: Type.Optional(Type.String()),
        })
      ),
    })
  ),
});

export type UpdateOrganizationBody = Static<typeof UpdateOrganizationSchema>;

/**
 * Member response schema
 */
export const MemberSchema = Type.Object({
  id: Type.String(),
  userId: Type.String(),
  organizationId: Type.String(),
  role: Type.Union([
    Type.Literal("owner"),
    Type.Literal("admin"),
    Type.Literal("member"),
    Type.Literal("viewer"),
  ]),
  user: Type.Object({
    id: Type.String(),
    email: Type.String({ format: "email" }),
    fullName: Type.Union([Type.String(), Type.Null()]),
    avatarUrl: Type.Union([Type.String({ format: "uri" }), Type.Null()]),
  }),
  joinedAt: Type.String({ format: "date-time" }),
});

export type MemberResponse = Static<typeof MemberSchema>;

/**
 * Update member role schema
 */
export const UpdateMemberRoleSchema = Type.Object({
  role: Type.Union([Type.Literal("admin"), Type.Literal("member"), Type.Literal("viewer")]),
});

export type UpdateMemberRoleBody = Static<typeof UpdateMemberRoleSchema>;

/**
 * Invitation response schema
 */
export const InvitationSchema = Type.Object({
  id: Type.String(),
  organizationId: Type.String(),
  email: Type.String({ format: "email" }),
  role: Type.Union([
    Type.Literal("owner"),
    Type.Literal("admin"),
    Type.Literal("member"),
    Type.Literal("viewer"),
  ]),
  invitedBy: Type.Object({
    id: Type.String(),
    email: Type.String({ format: "email" }),
    fullName: Type.Union([Type.String(), Type.Null()]),
  }),
  expiresAt: Type.String({ format: "date-time" }),
  createdAt: Type.String({ format: "date-time" }),
  status: Type.Union([Type.Literal("pending"), Type.Literal("accepted"), Type.Literal("expired")]),
});

export type InvitationResponse = Static<typeof InvitationSchema>;

/**
 * Create invitation schema
 */
export const CreateInvitationSchema = Type.Object({
  email: Type.String({ format: "email" }),
  role: Type.Union([Type.Literal("admin"), Type.Literal("member"), Type.Literal("viewer")]),
});

export type CreateInvitationBody = Static<typeof CreateInvitationSchema>;

/**
 * List response schemas
 */
export const OrganizationsListSchema = Type.Object({
  organizations: Type.Array(OrganizationSchema),
  total: Type.Integer(),
});

export const MembersListSchema = Type.Object({
  members: Type.Array(MemberSchema),
  total: Type.Integer(),
});

export const InvitationsListSchema = Type.Object({
  invitations: Type.Array(InvitationSchema),
  total: Type.Integer(),
});

/**
 * Common response schemas
 */
export const MessageSchema = Type.Object({
  message: Type.String(),
});

export const InvitationCreatedSchema = Type.Object({
  invitation: InvitationSchema,
  inviteUrl: Type.String({ format: "uri" }),
});

export const ErrorSchema = Type.Object({
  success: Type.Boolean(),
  error: Type.Object({
    code: Type.String(),
    message: Type.String(),
    details: Type.Optional(Type.String()),
  }),
});
