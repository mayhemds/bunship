/**
 * Health check routes
 * Used for monitoring and load balancer checks
 */
import { Elysia } from "elysia";
import { getDatabase, healthCheck as dbHealthCheck } from "@bunship/database";
import { checkRedisHealth } from "../jobs/queue";

export const healthRoutes = new Elysia({ prefix: "/health", tags: ["Health"] })
  .get(
    "/",
    () => ({
      status: "ok",
      timestamp: new Date().toISOString(),
    }),
    {
      detail: {
        summary: "Basic health check",
        description: "Returns OK if the API is running",
      },
    }
  )
  .get(
    "/ready",
    async ({ set }) => {
      const checks = {
        api: true,
        database: false,
        redis: false,
      };

      // Check database connection
      try {
        const db = getDatabase();
        checks.database = await dbHealthCheck(db);
      } catch (error) {
        console.error("Database health check failed:", error);
      }

      // Check Redis connection
      try {
        checks.redis = await checkRedisHealth();
      } catch (error) {
        console.error("Redis health check failed:", error);
      }

      const allHealthy = Object.values(checks).every(Boolean);

      if (!allHealthy) {
        set.status = 503;
      }

      return {
        status: allHealthy ? "ready" : "degraded",
        timestamp: new Date().toISOString(),
        checks,
      };
    },
    {
      detail: {
        summary: "Readiness check",
        description: "Returns detailed health status of all dependencies",
      },
    }
  );
