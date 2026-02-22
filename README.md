<p align="center">
  <img src="https://via.placeholder.com/200x80?text=BunShip" alt="BunShip Logo" width="200" />
</p>

<h1 align="center">BunShip</h1>

<p align="center">
  <strong>A production-ready SaaS backend boilerplate built with Bun + Elysia</strong>
</p>

<p align="center">
  <a href="https://docs.bunship.com">Documentation</a> &bull;
  <a href="https://bunship.com">Website</a> &bull;
  <a href="https://bunship.com/pricing">BunShip Pro</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/bun-%23000000.svg?style=for-the-badge&logo=bun&logoColor=white" alt="Bun" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Stripe-626CD9?style=for-the-badge&logo=Stripe&logoColor=white" alt="Stripe" />
  <img src="https://img.shields.io/badge/sqlite-%2307405e.svg?style=for-the-badge&logo=sqlite&logoColor=white" alt="SQLite" />
</p>

---

## What is BunShip?

BunShip gives you a complete SaaS backend that you can clone and start building on immediately. Instead of spending weeks wiring up authentication, billing, team management, and API infrastructure, you get all of that out of the box.

You clone this repository, install dependencies, run one command, and you have a working API with user registration, JWT authentication, Stripe subscriptions, team management, and more — all type-safe with TypeScript.

This is the **free API-only edition**. It includes the full backend with every feature listed below. If you also need a frontend (dashboard, auth pages, admin panel), see [BunShip Pro](https://bunship.com/pricing).

---

## What You Get

**Authentication** — JWT access/refresh tokens, two-factor auth (TOTP), magic links, Google and GitHub OAuth, session management, account lockout protection.

**Multi-Tenancy** — Organizations with team invitations, role-based access control (owner, admin, member, viewer), and granular permissions you can customize per resource.

**Billing** — Stripe integration with subscriptions, free/Pro/Enterprise tiers, usage tracking, and a customer self-service portal. Works in Stripe test mode with no paid account needed.

**API Infrastructure** — Outgoing webhooks with signed payloads and retries, scoped API keys, audit logging, rate limiting, and auto-generated OpenAPI documentation.

**Background Jobs** — BullMQ-powered job queues running on Redis for email delivery, webhook dispatch, and anything else you need to process asynchronously.

**File Storage** — S3-compatible uploads that work with AWS S3, Cloudflare R2, or MinIO for local development.

**Email** — Transactional email templates built with React Email and sent through Resend. Verification emails, password resets, and team invitations are pre-built.

---

## How It Works

BunShip is a monorepo with two main parts:

- **`apps/api`** — The main Elysia API application. This is where your routes, middleware, services, and background jobs live. It starts on `http://localhost:3000` and exposes a REST API with interactive documentation at `/docs`.

- **`packages/`** — Shared libraries used by the API. The database schema (Drizzle ORM), configuration, email templates, utilities, and a type-safe API client (Eden) that you can use from any frontend.

Everything is configured through a single `.env` file (auto-created when you install) and a few TypeScript config files in `packages/config/`. You control feature toggles, billing plans, permissions, and application settings without touching the core API code.

The database uses Turso (SQLite) — a local file for development and a cloud database for production. No PostgreSQL or MySQL setup required.

---

## Quick Start

**Prerequisites:** [Bun](https://bun.sh) v1.3.7+ and [Redis](https://redis.io) v7+

```bash
git clone https://github.com/mayhemds/bunship.git my-saas
cd my-saas
bun install
bun run db:migrate
bun dev
```

That's it. The API is running at `http://localhost:3000`. Visit `http://localhost:3000/docs` to see the interactive API documentation.

Optionally, run `bun run db:seed` to populate demo data. You can then log in with `demo@bunship.com` / `demo123456`.

For detailed setup (Stripe, email, OAuth, Docker), see the **[Installation Guide](https://docs.bunship.com/installation)**.

---

## Documentation

Full documentation is at **[docs.bunship.com](https://docs.bunship.com)**. Here's where to start:

| Guide                                                                         | What it covers                                                               |
| ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| **[Quickstart](https://docs.bunship.com/quickstart)**                         | Get running in under 5 minutes                                               |
| **[Installation](https://docs.bunship.com/installation)**                     | Full environment setup — database, Stripe, email, OAuth, Redis, file storage |
| **[Architecture](https://docs.bunship.com/concepts/architecture)**            | How routes, services, and middleware are organized                           |
| **[Authentication](https://docs.bunship.com/concepts/authentication)**        | JWT tokens, 2FA, magic links, OAuth flows                                    |
| **[Configuration](https://docs.bunship.com/customization/configuration)**     | Feature toggles, billing plans, permissions, CORS, rate limiting             |
| **[Adding Routes](https://docs.bunship.com/customization/adding-routes)**     | How to add your own API endpoints                                            |
| **[Database Schema](https://docs.bunship.com/customization/database-schema)** | How to modify and extend the database with Drizzle ORM                       |
| **[API Reference](https://docs.bunship.com/api-reference/introduction)**      | Interactive documentation for every endpoint                                 |
| **[Deployment](https://docs.bunship.com/deployment/overview)**                | Docker, Railway, Fly.io, and AWS deployment guides                           |

---

## Tech Stack

| Component     | Technology                                         | Purpose                              |
| ------------- | -------------------------------------------------- | ------------------------------------ |
| **Runtime**   | [Bun](https://bun.sh)                              | JavaScript runtime & package manager |
| **Framework** | [Elysia](https://elysiajs.com)                     | Type-safe web framework              |
| **Database**  | [Turso](https://turso.tech) / SQLite               | Edge-ready database                  |
| **ORM**       | [Drizzle](https://orm.drizzle.team)                | Type-safe ORM                        |
| **Auth**      | Custom JWT + [jose](https://github.com/panva/jose) | Authentication                       |
| **Payments**  | [Stripe](https://stripe.com)                       | Subscriptions & billing              |
| **Email**     | [Resend](https://resend.com) + React Email         | Transactional emails                 |
| **Queue**     | [BullMQ](https://docs.bullmq.io)                   | Background jobs                      |
| **Cache**     | [Redis](https://redis.io)                          | Caching & job queues                 |

---

## BunShip Pro

Looking for a complete fullstack solution? **[BunShip Pro](https://bunship.com/pricing)** includes everything in this free API boilerplate plus a TanStack Start + React frontend with shadcn/ui — dashboard, auth pages, organization management, admin panel, dark/light mode, all pre-built and connected to the API.

---

## Support

- **Documentation**: [docs.bunship.com](https://docs.bunship.com)
- **Website**: [bunship.com](https://bunship.com)
- **Issues**: [GitHub Issues](https://github.com/mayhemds/bunship/issues)

---

## License

MIT License. See [LICENSE](./LICENSE) for details.
