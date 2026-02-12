<p align="center">
  <img src="https://via.placeholder.com/200x80?text=BunShip" alt="BunShip Logo" width="200" />
</p>

<h1 align="center">BunShip</h1>

<p align="center">
  <strong>The fastest SaaS boilerplate built with Bun + Elysia</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#documentation">Documentation</a> •
  <a href="#license">License</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/redis-%23DD0031.svg?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
</p>

---

## Why BunShip?

BunShip is the **first commercial-grade Bun + Elysia SaaS boilerplate** on the market. Skip weeks of boilerplate setup and start building your product immediately.

- **First to market** - No other Bun + Elysia SaaS boilerplate exists
- **Blazing fast** - Bun outperforms Node.js by 3-4x
- **Type-safe end-to-end** - Full TypeScript with Eden client
- **Edge-ready** - Turso SQLite for global deployment
- **Zero config** - Works out of the box with sensible defaults

---

## Features

### Authentication & Security

- :lock: **JWT Authentication** - Access + refresh token pair with secure rotation
- :key: **Two-Factor Auth** - TOTP-based 2FA with backup codes
- :email: **Magic Links** - Passwordless authentication option
- :globe_with_meridians: **OAuth Ready** - Google and GitHub pre-configured
- :shield: **Account Lockout** - Protection against brute force attacks
- :mag: **Session Management** - View and revoke active sessions

### Multi-Tenancy

- :office: **Organizations** - Full multi-tenant architecture
- :busts_in_silhouette: **Team Management** - Invite members with email invitations
- :closed_lock_with_key: **Role-Based Access** - Owner, Admin, Member, Viewer roles
- :white_check_mark: **Granular Permissions** - Fine-grained permission system

### Billing & Subscriptions

- :credit_card: **Stripe Integration** - Subscriptions, trials, and usage limits
- :chart_with_upwards_trend: **Usage Tracking** - Track API requests, storage, and more
- :receipt: **Customer Portal** - Self-service billing management
- :moneybag: **Multiple Plans** - Free, Pro, and Enterprise tiers included

### Developer Experience

- :rocket: **Type-Safe Client** - Eden client with full type inference
- :book: **Auto-Generated Docs** - OpenAPI/Swagger documentation
- :test_tube: **Testing Ready** - Unit and integration test setup
- :art: **Consistent Errors** - Structured error responses

### Infrastructure

- :incoming_envelope: **Email Templates** - React Email with Resend
- :hook: **Outgoing Webhooks** - Signed payloads with automatic retries
- :key: **API Key Management** - Scoped keys for integrations
- :scroll: **Audit Logging** - Track all changes with retention policies
- :file_folder: **File Uploads** - S3-compatible storage
- :zap: **Background Jobs** - BullMQ with Redis
- :floppy_disk: **Caching** - Redis-backed caching layer

---

## Quick Start

### Prerequisites

- [Bun](https://bun.sh) v1.1.0 or later
- [Redis](https://redis.io) v7+ (for queues and caching)
- [Turso CLI](https://docs.turso.tech/cli/installation) (optional, for cloud database)

### Installation

```bash
# Clone the repository
git clone https://github.com/mayhemds/bunship.git my-saas
cd my-saas

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Edit .env with your configuration
# At minimum, set JWT_SECRET and JWT_REFRESH_SECRET

# Run database migrations
bun run db:migrate

# Seed demo data (optional)
bun run db:seed

# Start development server
bun dev
```

### Verify Installation

Once running, visit:

- **API**: http://localhost:3000
- **Health Check**: http://localhost:3000/health
- **API Documentation**: http://localhost:3000/docs

### Demo Credentials

After running `bun run db:seed`:

```
Email: demo@bunship.com
Password: demo123456
```

---

## Tech Stack

| Component      | Technology                                         | Purpose                              |
| -------------- | -------------------------------------------------- | ------------------------------------ |
| **Runtime**    | [Bun](https://bun.sh)                              | JavaScript runtime & package manager |
| **Framework**  | [Elysia](https://elysiajs.com)                     | Type-safe web framework              |
| **Database**   | [Turso](https://turso.tech) / SQLite               | Edge-ready database                  |
| **ORM**        | [Drizzle](https://orm.drizzle.team)                | Type-safe ORM                        |
| **Auth**       | Custom JWT + [jose](https://github.com/panva/jose) | Authentication                       |
| **Validation** | Elysia TypeBox                                     | Request/response validation          |
| **Payments**   | [Stripe](https://stripe.com)                       | Subscriptions & billing              |
| **Email**      | [Resend](https://resend.com) + React Email         | Transactional emails                 |
| **Queue**      | [BullMQ](https://docs.bullmq.io)                   | Background jobs                      |
| **Cache**      | [Redis](https://redis.io)                          | Caching & sessions                   |
| **Docs**       | [Scalar](https://scalar.com)                       | OpenAPI documentation                |

---

## Project Structure

```
bunship/
├── apps/
│   ├── api/                 # Main Elysia API application
│   │   ├── src/
│   │   │   ├── index.ts     # Entry point
│   │   │   ├── routes/      # API route handlers
│   │   │   ├── middleware/  # Auth, org, permission middleware
│   │   │   ├── services/    # Business logic
│   │   │   ├── lib/         # Utilities (JWT, crypto, etc.)
│   │   │   └── jobs/        # Background job workers
│   │   └── package.json
│   └── docs/                # Documentation site (Mintlify)
├── packages/
│   ├── config/              # Shared configuration
│   ├── database/            # Drizzle schema & migrations
│   ├── emails/              # Email templates (React Email)
│   ├── eden/                # Type-safe API client
│   └── utils/               # Shared utilities
├── docker/                  # Docker configuration
├── .env.example             # Environment variable template
├── package.json             # Workspace root
└── turbo.json               # Turborepo configuration
```

---

## Documentation

Full documentation is available at **[docs.bunship.com](https://docs.bunship.com)**.

| Document                               | Description                           |
| -------------------------------------- | ------------------------------------- |
| [docs.bunship.com](https://docs.bunship.com) | Full documentation site         |
| [SETUP.md](./SETUP.md)                 | Detailed setup and installation guide |
| [CHANGELOG.md](./CHANGELOG.md)         | Version history and updates           |
| [CONTRIBUTING.md](./CONTRIBUTING.md)   | Contribution guidelines               |

### External Documentation

- [Elysia Documentation](https://elysiajs.com) - Framework documentation
- [Drizzle Documentation](https://orm.drizzle.team) - ORM documentation
- [Turso Documentation](https://docs.turso.tech) - Database documentation

---

## Scripts

```bash
# Development
bun dev              # Start API in development mode
bun dev:all          # Start all apps with Turborepo

# Database
bun run db:generate  # Generate migrations from schema
bun run db:migrate   # Run migrations
bun run db:seed      # Seed demo data
bun run db:studio    # Open Drizzle Studio

# Testing
bun test             # Run all tests
bun test:unit        # Run unit tests
bun test:integration # Run integration tests

# Building
bun run build        # Build all packages
bun run typecheck    # Type check all packages

# Code Quality
bun run lint         # Lint all packages
bun run format       # Format with Prettier

# Docker
bun run docker:dev   # Start with Docker Compose
bun run docker:build # Build Docker image
```

---

## API Overview

BunShip includes a complete API with the following endpoint groups:

| Group             | Endpoints                                 | Description                              |
| ----------------- | ----------------------------------------- | ---------------------------------------- |
| **Auth**          | `/api/v1/auth/*`                          | Registration, login, 2FA, password reset |
| **Users**         | `/api/v1/users/*`                         | Profile, sessions, notifications         |
| **Organizations** | `/api/v1/organizations/*`                 | CRUD, settings, transfer                 |
| **Members**       | `/api/v1/organizations/:id/members/*`     | Team management                          |
| **Invitations**   | `/api/v1/organizations/:id/invitations/*` | Team invites                             |
| **Billing**       | `/api/v1/organizations/:id/billing/*`     | Subscriptions, portal                    |
| **Webhooks**      | `/api/v1/organizations/:id/webhooks/*`    | Webhook endpoints                        |
| **API Keys**      | `/api/v1/organizations/:id/api-keys/*`    | Key management                           |
| **Audit Logs**    | `/api/v1/organizations/:id/audit-logs/*`  | Activity logs                            |
| **Projects**      | `/api/v1/organizations/:id/projects/*`    | Example resource                         |
| **Admin**         | `/api/v1/admin/*`                         | System administration                    |

Visit `/docs` when running the API for the complete interactive documentation.

---

## Eden Client (Type-Safe API)

BunShip exports an Eden client for type-safe API calls from your frontend:

```typescript
import { createClient } from "@bunship/eden";

const api = createClient("http://localhost:3000");

// Full type inference - autocomplete and type checking
const { data, error } = await api.api.v1.auth.login.post({
  email: "user@example.com",
  password: "password123",
});

if (error) {
  console.error(error.message);
} else {
  console.log("Logged in:", data.user);
}
```

---

## BunShip Pro

Looking for a complete fullstack solution? **[BunShip Pro](https://bunship.com/pricing)** includes everything in this free API boilerplate plus a TanStack Start + React frontend with shadcn/ui — dashboard, auth pages, org management, admin panel, dark/light mode, all pre-built.

---

## Support

- **Website**: [bunship.com](https://bunship.com)
- **Docs**: [docs.bunship.com](https://docs.bunship.com)
- **Issues**: [GitHub Issues](https://github.com/mayhemds/bunship/issues)

---

## License

BunShip is licensed under the [MIT License](./LICENSE).

---

<p align="center">
  Built with :heart: using <a href="https://bun.sh">Bun</a> + <a href="https://elysiajs.com">Elysia</a>
</p>
