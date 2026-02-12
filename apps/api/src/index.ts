/**
 * BunShip API - Main Entry Point
 *
 * The fastest SaaS boilerplate built with Bun + Elysia
 */
import { Elysia } from "elysia";
import { swagger } from "@elysiajs/swagger";
import { cors } from "@elysiajs/cors";
import { helmet } from "elysia-helmet";

import { appConfig } from "@bunship/config";
import { errorHandler } from "./plugins/errorHandler";
import { logger } from "./plugins/logger";
import { healthRoutes } from "./routes/health";
import { authRoutes } from "./routes/auth";
import { adminRoutes } from "./routes/admin";
import { userRoutes } from "./routes/users";
import { organizationRoutes } from "./routes/organizations";
import { stripeWebhookRoutes } from "./routes/webhooks/stripe";
import { cronRoutes } from "./routes/cron";

// Build the application
const app = new Elysia()
  // Security and CORS
  .use(
    cors({
      origin: appConfig.api.cors.origins,
      credentials: appConfig.api.cors.credentials,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-API-Key"],
    })
  )
  // Security headers — relax CSP for /docs (Scalar UI) in non-production
  .use(
    helmet({
      contentSecurityPolicy: process.env.NODE_ENV === "production"
        ? undefined // strict defaults in production
        : {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
              styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
              imgSrc: ["'self'", "data:", "https:"],
              fontSrc: ["'self'", "https://cdn.jsdelivr.net"],
              connectSrc: ["'self'"],
            },
          },
    })
  )
  // OpenAPI Documentation (disabled in production)
  .use((app) => {
    if (process.env.NODE_ENV === "production") return app;
    return app.use(
      swagger({
        path: appConfig.docs.path,
        documentation: {
          info: {
            title: appConfig.docs.title,
            description: appConfig.docs.description,
            version: appConfig.docs.version,
          },
          tags: [
            { name: "Health", description: "Health check endpoints" },
            { name: "Auth", description: "Authentication endpoints" },
            { name: "Users", description: "User management" },
            { name: "Organizations", description: "Organization management" },
            { name: "Members", description: "Team member management" },
            { name: "Invitations", description: "Team invitations" },
            { name: "Billing", description: "Subscription and billing" },
            { name: "Webhooks", description: "Webhook management" },
            { name: "API Keys", description: "API key management" },
            { name: "Audit Logs", description: "Audit log viewing" },
            { name: "Files", description: "File upload and management" },
            { name: "Projects", description: "Project management (example resource)" },
            { name: "Admin", description: "Admin operations" },
          ],
          components: {
            securitySchemes: {
              bearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
              },
              apiKey: {
                type: "apiKey",
                in: "header",
                name: "X-API-Key",
              },
            },
          },
        },
      })
    );
  })
  // Error handling (must come before logger so errors are caught)
  .use(errorHandler)
  // Logging
  .use(logger)
  // Root endpoint
  .get("/", () => ({
    name: appConfig.name,
    description: appConfig.description,
    version: appConfig.docs.version,
    docs: `${appConfig.url}${appConfig.docs.path}`,
  }))
  // Health routes (outside API prefix)
  .use(healthRoutes)
  // Stripe webhooks (outside API prefix - called by Stripe)
  .use(stripeWebhookRoutes)
  // Cron job endpoints (outside API prefix - called by scheduler)
  .use(cronRoutes)
  // API v1 routes
  .group(appConfig.api.prefix, (app) =>
    app
      // Authentication routes
      .use(authRoutes)
      // Admin routes
      .use(adminRoutes)
      // User routes
      .use(userRoutes)
      // Organization routes (includes billing, webhooks, API keys, audit logs, files)
      .use(organizationRoutes)
      .get("/", () => ({
        message: "BunShip API v1",
        endpoints: {
          auth: "/auth",
          users: "/users",
          organizations: "/organizations",
          admin: "/admin",
        },
      }))
  )
  // Start the server
  .listen(appConfig.api.port);

// Startup message
console.log(`
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🚀 BunShip API is running!                            │
│                                                         │
│   Local:    http://localhost:${appConfig.api.port.toString().padEnd(25)}│
│   API:      http://localhost:${appConfig.api.port}${appConfig.api.prefix.padEnd(19)}│
│   Docs:     http://localhost:${appConfig.api.port}${appConfig.docs.path.padEnd(20)}│
│                                                         │
│   Environment: ${(process.env.NODE_ENV ?? "development").padEnd(35)}│
│                                                         │
└─────────────────────────────────────────────────────────┘
`);

// Export type for Eden client
export type App = typeof app;
