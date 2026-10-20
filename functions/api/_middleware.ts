import type { PagesFunction } from "@cloudflare/workers-types";
import { json, type Env } from "../lib/env";
import { MAX_BODY_BYTES, RULES, take } from "../lib/limits";
import { hashToken, sessionToken } from "../lib/session";

/** Security headers for every API answer (T7.2). public/_headers only covers static files, never the API's answers. JSON
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
