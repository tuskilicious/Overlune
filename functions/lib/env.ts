import type { D1Database } from "@cloudflare/workers-types";

/** What the Functions get from wrangler.jsonc and the dashboard's secrets. */
export interface Env {
  DB: D1Database;
  VITE_SENTRY_DSN?: string;
  VITE_SENTRY_ENVIRONMENT?: string;
  /** "true" where accounts are open (local and previews). Production stays closed until the privacy policy and terms
   *  cover accounts (T7.8) and the launch check passes (T7.9): every account route answers 404 there. */
  ACCOUNTS_OPEN?: string;
  /** Where sign-in comes back to: overlune.in, the staging alias, or localhost (wrangler.jsonc). */
  AUTH_ORIGIN: string;
  /** Secrets, set in the dashboard (or .dev.vars locally): the Twitch app for this environment. */
  TWITCH_CLIENT_ID: string;
  TWITCH_CLIENT_SECRET: string;
}

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
