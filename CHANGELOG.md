# Changelog

All notable changes to BunShip will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- SSO/SAML authentication for Enterprise plan
- Custom domain support for organizations
- Advanced analytics dashboard
- Webhook event filtering

---

## [1.0.0] - 2025-01-28

### Added

#### Authentication

- Email and password authentication with Argon2id hashing
- JWT access and refresh token pair with secure rotation
- Magic link passwordless authentication
- Google OAuth integration
- GitHub OAuth integration
- TOTP-based two-factor authentication with backup codes
- Email verification flow
- Password reset flow
- Account lockout protection after failed attempts
- Session management (view and revoke active sessions)

#### Multi-Tenancy

- Organization management (create, update, delete)
- Team member invitations via email
- Role-based access control (Owner, Admin, Member, Viewer)
- Granular permission system
- Organization ownership transfer
- Support for users in multiple organizations

#### Billing & Subscriptions

- Stripe integration for subscriptions
- Three-tier pricing (Free, Pro, Enterprise)
- 14-day trial period for paid plans
- Usage tracking and limits enforcement
- Customer billing portal
- Webhook handling for subscription events
- Invoice history

#### Webhooks

- Outgoing webhook system
- HMAC-SHA256 signed payloads
- Automatic retry with exponential backoff
- Delivery logs with response tracking
- Secret rotation
- Test endpoint functionality

#### API Keys

- Scoped API key generation
- Key expiration support
- Usage tracking (last used timestamp)
- Rate limiting per key

#### Audit Logging

- Comprehensive audit trail for all mutations
- Configurable retention period (90 days default)
- Filterable by action, actor, and resource

#### File Uploads

- S3-compatible storage support
- File type validation
- Size limits per plan
- Secure presigned URLs

#### Background Jobs

- BullMQ-based job queue
- Email queue with configurable concurrency
- Webhook delivery queue with retries
- Cleanup jobs for expired data

#### Email

- React Email templates
- Welcome email
- Email verification
- Password reset
- Team invitation
- Invoice notification
- Subscription status changes

#### Developer Experience

- Type-safe Eden client for frontend integration
- Auto-generated OpenAPI documentation
- Swagger/Scalar UI at `/docs`
- Comprehensive error handling with structured responses
- Request validation with TypeBox

#### Infrastructure

- Monorepo structure with Turborepo
- Bun runtime for optimal performance
- Drizzle ORM with Turso/SQLite
- Redis for caching and queues
- Docker support with Docker Compose
- GitHub Actions CI/CD workflows

#### Documentation

- README with quick start guide
- Detailed setup instructions
- Customization guide
- Contributing guidelines

### Security

- Helmet middleware for security headers
- CORS configuration
- Rate limiting on all endpoints
- Input validation on all routes
- Secure password hashing with Argon2id
- JWT with short expiry and secure refresh
- API key hashing (keys never stored in plain text)
- Webhook signature verification

---

## Version History

| Version | Date       | Description     |
| ------- | ---------- | --------------- |
| 1.0.0   | 2025-01-28 | Initial release |

---

## Upgrade Guide

### Upgrading from Pre-release

If you were using a pre-release version:

1. Back up your database
2. Pull the latest changes: `git pull origin main`
3. Install dependencies: `bun install`
4. Run migrations: `bun run db:migrate`
5. Review `.env.example` for new environment variables
6. Restart your application

### Breaking Changes

None - this is the initial release.

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for how to contribute to BunShip.

When submitting a pull request, please update this changelog with your changes under the `[Unreleased]` section.
