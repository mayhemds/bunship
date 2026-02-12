# BunShip Setup Guide

This guide walks you through setting up BunShip for local development and production deployment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [Running in Development](#running-in-development)
- [Running in Production](#running-in-production)
- [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before installing BunShip, ensure you have the following installed on your system:

### Required

| Software  | Version | Installation                                            |
| --------- | ------- | ------------------------------------------------------- |
| **Bun**   | 1.1.0+  | [bun.sh](https://bun.sh)                                |
| **Redis** | 7.0+    | [redis.io/docs/install](https://redis.io/docs/install/) |

### Optional (for cloud database)

| Software      | Purpose                 | Installation                                                    |
| ------------- | ----------------------- | --------------------------------------------------------------- |
| **Turso CLI** | Cloud SQLite management | [docs.turso.tech/cli](https://docs.turso.tech/cli/installation) |

### Installing Bun

```bash
# macOS, Linux, WSL
curl -fsSL https://bun.sh/install | bash

# Verify installation
bun --version
```

### Installing Redis

**macOS (Homebrew):**

```bash
brew install redis
brew services start redis
```

**Ubuntu/Debian:**

```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

**Docker:**

```bash
docker run -d --name redis -p 6379:6379 redis:7-alpine
```

**Verify Redis is running:**

```bash
redis-cli ping
# Should return: PONG
```

---

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/bunship.git my-saas
cd my-saas
```

### 2. Install Dependencies

```bash
bun install
```

This installs all dependencies for the monorepo, including:

- `apps/api` - Main API application
- `apps/docs` - Documentation site
- `packages/config` - Shared configuration
- `packages/database` - Database schema and client
- `packages/emails` - Email templates
- `packages/eden` - Type-safe API client
- `packages/utils` - Shared utilities

### 3. Create Environment File

```bash
cp .env.example .env
```

---

## Environment Configuration

Edit the `.env` file with your configuration. Below is a detailed explanation of each variable.

### Application Settings

```bash
# Environment mode: development, production, or test
NODE_ENV=development

# API URL (where your API is hosted)
API_URL=http://localhost:3000

# Frontend URL (for CORS and email links)
FRONTEND_URL=http://localhost:5173
```

### Database (Turso/SQLite)

BunShip uses Turso (libSQL/SQLite) for the database. You can run locally with a file-based database or connect to Turso cloud.

**Local Development (File-based):**

```bash
DATABASE_URL=file:./local.db
# DATABASE_AUTH_TOKEN is not needed for local files
```

**Turso Cloud:**

```bash
DATABASE_URL=libsql://your-database-name.turso.io
DATABASE_AUTH_TOKEN=your-turso-auth-token
```

To get Turso credentials:

```bash
# Install Turso CLI
curl -sSfL https://get.tur.so/install.sh | bash

# Login
turso auth login

# Create a database
turso db create bunship

# Get the URL
turso db show bunship --url

# Create an auth token
turso db tokens create bunship
```

### Redis

Redis is used for background job queues and caching.

```bash
# Individual host and port (used by BullMQ)
REDIS_HOST=localhost
REDIS_PORT=6379

# Full URL (used by some libraries)
REDIS_URL=redis://localhost:6379
```

**With authentication:**

```bash
REDIS_URL=redis://:your-password@localhost:6379
```

### JWT Authentication

Generate secure random secrets for JWT signing. These should be at least 32 characters.

```bash
# Generate secrets using Bun
bun -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Access token secret (short-lived tokens)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-change-in-production

# Refresh token secret (long-lived tokens)
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-chars-change-in-production
```

**Important:** Use different values for `JWT_SECRET` and `JWT_REFRESH_SECRET` in production.

### Stripe Billing

Create a Stripe account at [stripe.com](https://stripe.com) and get your API keys.

```bash
# Secret key (from Stripe Dashboard > Developers > API keys)
STRIPE_SECRET_KEY=sk_test_xxx

# Webhook secret (created when you add a webhook endpoint)
STRIPE_WEBHOOK_SECRET=whsec_xxx

# Price IDs (create products in Stripe Dashboard > Products)
STRIPE_PRO_MONTHLY_PRICE_ID=price_xxx
STRIPE_PRO_YEARLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_MONTHLY_PRICE_ID=price_xxx
STRIPE_ENTERPRISE_YEARLY_PRICE_ID=price_xxx
```

**Setting up Stripe Webhooks:**

1. Go to Stripe Dashboard > Developers > Webhooks
2. Add endpoint: `https://your-domain.com/webhooks/stripe`
3. Select events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. Copy the signing secret to `STRIPE_WEBHOOK_SECRET`

For local development, use the [Stripe CLI](https://stripe.com/docs/stripe-cli):

```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

### Email (Resend)

Create a Resend account at [resend.com](https://resend.com) and get your API key.

```bash
# API key from Resend Dashboard
RESEND_API_KEY=re_xxx

# From address (must be from a verified domain)
EMAIL_FROM="BunShip <hello@bunship.com>"
```

**Verifying your domain in Resend:**

1. Go to Resend Dashboard > Domains
2. Add your domain
3. Add the DNS records Resend provides
4. Wait for verification

For development, you can use Resend's test mode which sends to any email address.

### File Storage (S3-Compatible)

BunShip supports any S3-compatible storage (AWS S3, Cloudflare R2, MinIO, etc.).

```bash
# S3 endpoint URL
S3_ENDPOINT=https://s3.amazonaws.com

# Bucket name
S3_BUCKET=your-bucket

# Access credentials
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx

# Region
S3_REGION=us-east-1
```

**For Cloudflare R2:**

```bash
S3_ENDPOINT=https://YOUR_ACCOUNT_ID.r2.cloudflarestorage.com
S3_BUCKET=your-bucket
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=xxx
S3_REGION=auto
```

### OAuth Providers (Optional)

Configure OAuth providers for social login.

**Google OAuth:**

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:3000/api/v1/auth/google/callback`

```bash
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
```

**GitHub OAuth:**

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Create a new OAuth App
3. Set callback URL: `http://localhost:3000/api/v1/auth/github/callback`

```bash
GITHUB_CLIENT_ID=xxx
GITHUB_CLIENT_SECRET=xxx
```

### Two-Factor Authentication

```bash
# Issuer name shown in authenticator apps
TOTP_ISSUER=BunShip
```

### Demo Mode

Enable demo mode to prevent certain actions in a demo environment.

```bash
# Enable demo mode (prevents account deletion, etc.)
DEMO_MODE=false

# Secret for cron job endpoints
CRON_SECRET=your-cron-secret
```

---

## Database Setup

### Run Migrations

Apply the database schema:

```bash
bun run db:migrate
```

### Seed Demo Data (Optional)

Populate the database with demo data:

```bash
bun run db:seed
```

This creates:

- Demo user: `demo@bunship.com` / `demo123456`
- Demo organization with Pro plan on trial
- Sample projects

### Database Management

```bash
# Generate new migration from schema changes
bun run db:generate

# Push schema directly (development only)
bun run db:push

# Open Drizzle Studio (visual database browser)
bun run db:studio

# Reset database (drops all data)
bun run db:reset
```

---

## Running in Development

### Start the API

```bash
bun dev
```

The API will start at `http://localhost:3000`.

### Start All Services

To start all apps (API + docs) with Turborepo:

```bash
bun dev:all
```

### Verify the Setup

1. **Health Check:**

   ```bash
   curl http://localhost:3000/health
   # {"status":"ok","timestamp":"2025-01-28T..."}
   ```

2. **API Documentation:**
   Open http://localhost:3000/docs in your browser

3. **Test Authentication:**
   ```bash
   curl -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"demo@bunship.com","password":"demo123456"}'
   ```

---

## Running in Production

### Environment Variables

Set all environment variables for production:

```bash
NODE_ENV=production
API_URL=https://api.yourdomain.com
FRONTEND_URL=https://yourdomain.com
DATABASE_URL=libsql://your-db.turso.io
DATABASE_AUTH_TOKEN=your-production-token
REDIS_URL=redis://your-redis-host:6379
JWT_SECRET=production-secret-min-32-chars
JWT_REFRESH_SECRET=production-refresh-secret
# ... all other production values
```

### Build for Production

```bash
bun run build
```

### Start Production Server

```bash
bun start
```

### Using Docker

**Build the image:**

```bash
bun run docker:build
```

**Run with Docker Compose:**

```bash
docker-compose -f docker/docker-compose.yml up -d
```

**Docker Compose includes:**

- API service
- Worker service (background jobs)
- Redis service

### Process Management

For production without Docker, use a process manager like PM2:

```bash
# Install PM2
bun add -g pm2

# Start the API
pm2 start "bun start" --name bunship-api

# Start workers
pm2 start "bun run apps/api/src/jobs/worker.ts" --name bunship-worker

# Save configuration
pm2 save

# Setup startup script
pm2 startup
```

---

## Troubleshooting

### Common Issues

**"Cannot find module" errors:**

```bash
# Clear node_modules and reinstall
bun run clean
bun install
```

**Database connection failed:**

```bash
# Check if DATABASE_URL is set correctly
echo $DATABASE_URL

# For local file DB, ensure the directory is writable
# For Turso, verify auth token is valid
turso db tokens validate YOUR_TOKEN
```

**Redis connection refused:**

```bash
# Check if Redis is running
redis-cli ping

# Check Redis URL
echo $REDIS_URL
```

**Port already in use:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 bun dev
```

**JWT errors:**

```bash
# Ensure secrets are set and long enough (32+ chars)
echo $JWT_SECRET | wc -c
# Should be 33 or more (32 chars + newline)
```

**Stripe webhook signature invalid:**

```bash
# Ensure you're using the correct webhook secret
# For local development, use Stripe CLI:
stripe listen --forward-to localhost:3000/webhooks/stripe
```

### Getting Help

- Check the [Documentation](https://docs.bunship.com)
- Search [GitHub Issues](https://github.com/your-org/bunship/issues)
- Email [support@bunship.com](mailto:support@bunship.com)

---

## Next Steps

Once your setup is complete:

1. Read the [Customization Guide](./CUSTOMIZATION.md) to adapt BunShip for your SaaS
2. Explore the API documentation at `/docs`
3. Review the [packages/config](./packages/config) to understand configuration options
4. Set up your CI/CD pipeline using the included GitHub Actions workflows
