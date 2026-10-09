import type { D1Database } from "@cloudflare/workers-types";

/** What the Functions get from wrangler.jsonc and the dashboard's secrets. Secrets are named here as they're used. */
export interface Env {
  DB: D1Database;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
}

/** A JSON response. The middleware adds the security headers and no-store. */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
