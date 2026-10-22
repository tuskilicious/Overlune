import type { D1Database, DurableObjectNamespace } from "@cloudflare/workers-types";
import type { OverlayLive } from "../live";

/** What the Functions get from wrangler.jsonc and the dashboard's secrets. */
export interface Env {
  DB: D1Database;
  /** Saved overlays' live channels (T12.3), one object per overlay. */
  LIVE: DurableObjectNamespace<OverlayLive>;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  /** "true" where accounts are open (local and previews). Production stays closed until the privacy policy and terms
   *  cover accounts (T7.8) and the launch check passes (T7.9): every account route answers 404 there. */
  ACCOUNTS_OPEN?: string;
  /** "true" where saved overlays are open (previews, and local through .dev.vars). Production stays closed until the
   *  privacy policy covers them (T12.6): every /api/overlays route answers 404 there. */
  SAVED_OVERLAYS_OPEN?: string;
  /** Where sign-in comes back to: overlune.in, the staging alias, or localhost (wrangler.jsonc). */
  AUTH_ORIGIN: string;
  /** Secrets, set in the dashboard (or .dev.vars locally): the Twitch app for this environment. */
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
}

/** What a route or middleware gets (T12.2): the request, the Worker's bindings, the path's `:name` parts, and the rest
 *  of the chain. */
export interface Context {
  request: Request;
  env: Env;
  params: Record<string, string>;
  next: () => Promise<Response>;
}

export type Handler = (c: Context) => Response | Promise<Response>;

/** A JSON response. The middleware adds the security headers and no-store. */
export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });

/** A redirect that sets cookies. Relative to the site, so it never leaves it. */
export function redirect(location: string, cookies: string[] = []): Response {
  const headers = new Headers({ Location: location });
  for (const c of cookies) headers.append("Set-Cookie", c);
  return new Response(null, { status: 302, headers });
}
