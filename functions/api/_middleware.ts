import type { PagesFunction } from "@cloudflare/workers-types";
import { sentryPagesPlugin } from "@sentry/cloudflare";
import { version } from "../../package.json";
import { dataCollection, scrubBreadcrumb, scrubEvent } from "../../src/lib/sentry-scrub";
import { json, type Env } from "../lib/env";
import { MAX_BODY_BYTES, RULES, take } from "../lib/limits";
import { hashToken, sessionToken } from "../lib/session";

/** Security headers for every API answer (T7.2). public/_headers only covers static files, never Functions. JSON
 *  never needs to load anything or sit in a frame, so the policy denies it all; nothing is cached. */
export const apiHeaders: Record<string, string> = {
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

export const securityHeaders: PagesFunction<Env> = async ({ next }) => {
  const response = await next();
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(apiHeaders)) secured.headers.set(name, value);
  return secured;
};

/** Abuse limits (T7.6): a body too big is a 413; too many requests, a 429 with Retry-After. Sign-in routes count per
 *  IP, account routes per session, everything else per IP (functions/lib/limits.ts has the numbers). */
export const abuseLimits: PagesFunction<Env> = async ({ request, next }) => {
  if (Number(request.headers.get("Content-Length") ?? 0) > MAX_BODY_BYTES)
    return json({ error: "too large" }, 413);
  const path = new URL(request.url).pathname;
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const token = sessionToken(request);
  const [key, rule] = path.startsWith("/api/auth/twitch")
    ? [`signin:${ip}`, RULES.signin]
    : token && (path === "/api/me" || path.startsWith("/api/auth/"))
      ? [`account:${await hashToken(token)}`, RULES.account]
      : [`api:${ip}`, RULES.api];
  const verdict = take(key, rule);
  if (verdict.ok) return next();
  const res = json({ error: "too many requests" }, 429);
  res.headers.set("Retry-After", String(verdict.retryAfter));
  return res;
};

/** Accounts stay closed where ACCOUNTS_OPEN isn't "true" (production, until T7.9): their routes answer like any
 *  unknown path, and the editor then shows no account controls. */
export const accountsGate: PagesFunction<Env> = ({ request, env, next }) => {
  const path = new URL(request.url).pathname;
  const account = path === "/api/me" || path.startsWith("/api/auth/");
  return account && env.ACCOUNTS_OPEN !== "true" ? json({ error: "not found" }, 404) : next();
};

/** Every /api request: Sentry first, with the site's privacy rules and scrubber (no PII, no settings fragments), so
 *  it sees errors from everything after it; then the headers; then the abuse limits; then the accounts switch. Without a DSN (local development) Sentry stays off. */
export const onRequest = [
  sentryPagesPlugin<Env>(({ env }) => ({
    dsn: env.VITE_SENTRY_DSN,
    environment: env.VITE_SENTRY_ENVIRONMENT,
    release: `overlune@${version}`,
    dataCollection,
    tracesSampleRate: env.VITE_SENTRY_ENVIRONMENT === "production" ? 0.05 : 1.0,
    // As on the site (T6.99): streamed spans skip beforeSendTransaction, so the scrubber would never see them.
    traceLifecycle: "static",
    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  })),
  securityHeaders,
  abuseLimits,
  accountsGate,
];
