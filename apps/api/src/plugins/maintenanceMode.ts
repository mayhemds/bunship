/**
 * Maintenance-mode gate. Returns 503 to non-admin, non-health requests when
 * the `maintenance_mode` app_setting is enabled. Admin endpoints stay open so
 * operators can toggle the flag back off.
 */
import { Elysia } from "elysia";
import { getMaintenanceMode } from "../services/admin.service";

const CACHE_TTL_MS = 5_000;

let cache: { enabled: boolean; expiresAt: number } | null = null;

async function isEnabled(): Promise<boolean> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.enabled;

  const { enabled } = await getMaintenanceMode();
  cache = { enabled, expiresAt: now + CACHE_TTL_MS };
  return enabled;
}

export function invalidateMaintenanceCache(): void {
  cache = null;
}

const BYPASS_PREFIXES = ["/health", "/v1/admin", "/webhooks/stripe", "/cron"];

export const maintenanceMode = new Elysia({ name: "maintenance-mode" }).onBeforeHandle(
  async ({ path, set }) => {
    if (BYPASS_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) return;

    if (await isEnabled()) {
      set.status = 503;
      set.headers["retry-after"] = "60";
      return {
        success: false,
        error: {
          code: "MAINTENANCE_MODE",
          message: "Service is temporarily unavailable for maintenance",
        },
      };
    }
  }
);
