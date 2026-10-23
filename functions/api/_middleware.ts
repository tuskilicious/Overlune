import { json, type Handler } from "../lib/env";
import { MAX_BODY_BYTES, MAX_OVERLAY_BODY_BYTES, RULES, take } from "../lib/limits";
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

export const securityHeaders: Handler = async ({ next }) => {
  const response = await next();
  // A live channel's WebSocket (T12.3) must go back as it is: copying the response would drop the socket.
  if (response.status === 101) return response;
  const secured = new Response(response.body, response);
  for (const [name, value] of Object.entries(apiHeaders)) secured.headers.set(name, value);
  return secured;
};

/** Saved overlays' routes (T12.2) and their live channels (T12.3). */
const overlaysPath = (path: string) =>
  path === "/api/overlays" || path.startsWith("/api/overlays/") || path.startsWith("/api/live/");
/** Routes that act for a signed-in account. */
const accountPath = (path: string) =>
  path === "/api/me" || path.startsWith("/api/auth/") || overlaysPath(path);

/** Abuse limits (T7.6): a body too big is a 413; too many requests, a 429 with Retry-After. Sign-in routes count per
 *  IP, account routes per session, everything else per IP (functions/lib/limits.ts has the numbers). Saved overlays
 *  carry their settings, so their limit is larger. */
export const abuseLimits: Handler = async ({ request, next }) => {
  const path = new URL(request.url).pathname;
  const max = overlaysPath(path) ? MAX_OVERLAY_BODY_BYTES : MAX_BODY_BYTES;
  if (Number(request.headers.get("Content-Length") ?? 0) > max)
    return json({ error: "too large" }, 413);
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const token = sessionToken(request);
  const [key, rule] = path.startsWith("/api/auth/twitch")
    ? [`signin:${ip}`, RULES.signin]
    : token && accountPath(path)
      ? [`account:${await hashToken(token)}`, RULES.account]
      : [`api:${ip}`, RULES.api];
  const verdict = take(key, rule);
  if (verdict.ok) return next();
  const res = json({ error: "too many requests" }, 429);
  res.headers.set("Retry-After", String(verdict.retryAfter));
  return res;
};

/** Accounts stay closed where ACCOUNTS_OPEN isn't "true" (production, until T7.9), and saved overlays where
 *  SAVED_OVERLAYS_OPEN isn't (production, until T12.6): their routes answer like any unknown path, and the editor
 *  then shows no controls for them. */
export const accountsGate: Handler = ({ request, env, next }) => {
  const path = new URL(request.url).pathname;
  const closed =
    (accountPath(path) && env.ACCOUNTS_OPEN !== "true") ||
    (overlaysPath(path) && env.SAVED_OVERLAYS_OPEN !== "true");
  return closed ? json({ error: "not found" }, 404) : next();
};
