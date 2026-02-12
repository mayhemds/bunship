/**
 * Request logging plugin
 */
import { Elysia } from "elysia";

export const logger = new Elysia({ name: "logger" })
  .onRequest(({ request, store }) => {
    (store as Record<string, unknown>).startTime = performance.now();
  })
  .onAfterResponse(({ request, set, store }) => {
    const startTime = (store as Record<string, number>).startTime;
    const duration = startTime ? (performance.now() - startTime).toFixed(2) : "?";
    const method = request.method;
    const url = new URL(request.url);
    const path = url.pathname;
    const status = set.status ?? 200;

    // Color based on status
    const statusColor =
      status >= 500
        ? "\x1b[31m" // red
        : status >= 400
          ? "\x1b[33m" // yellow
          : status >= 300
            ? "\x1b[36m" // cyan
            : "\x1b[32m"; // green

    const reset = "\x1b[0m";

    console.log(
      `${method.padEnd(7)} ${path.padEnd(40)} ${statusColor}${status}${reset} ${duration}ms`
    );
  });
