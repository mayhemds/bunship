/**
 * Application configuration
 * Core settings for the BunShip API
 */
export const appConfig = {
  name: "BunShip",
  description: "The fastest SaaS boilerplate built with Bun + Elysia",
  url: process.env.API_URL ?? "http://localhost:3000",
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",

  api: {
    prefix: "/api/v1",
    port: parseInt(process.env.PORT ?? "3000", 10),
    host: "0.0.0.0",
    rateLimit: {
      enabled: true,
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 100,
    },
    cors: {
      enabled: true,
      origins: (
        process.env.CORS_ORIGINS ??
        "http://localhost:5173,http://localhost:3000,http://localhost:3001"
      ).split(","),
      credentials: true,
    },
    maxBodySize: "10mb",
    timeout: 30000,
  },

  jwt: {
    accessTokenExpiry: "15m",
    refreshTokenExpiry: "7d",
    issuer: "bunship",
  },

  company: {
    name: "Your Company Inc.",
    email: "hello@bunship.com",
    supportEmail: "support@bunship.com",
  },

  docs: {
    enabled: true,
    path: "/docs",
    title: "BunShip API",
    description: "API documentation for BunShip",
    version: "1.0.0",
  },
} as const;

export type AppConfig = typeof appConfig;
