/**
 * Abuse limits in the API (T7.6). A counter in D1 would spend a write on every request (a flood could use up the free
 * plan's writes), so this counts in memory, per Worker instance: approximate, and free. (Since T12.1 the API is a
 * Worker, so the Workers rate limiting binding is an option too.) The main shield is the Cloudflare WAF rate-limiting rule on overlune.in, in front
 * of every Function (STACK.md). Counts are kept only in memory for a minute; IPs are never stored or logged.
 */

export interface Rule {
  limit: number;
  seconds: number;
}

/** The numbers (STACK.md). A person signs in once or twice; the editor asks /api/me once per visit. */
export const RULES = {
  /** Starting a sign-in and Twitch's callback, per IP. */
  signin: { limit: 10, seconds: 60 },
  /** Account routes with a session, per session (each needs its own Twitch sign-in). */
  account: { limit: 60, seconds: 60 },
  /** Everything else under /api, per IP. */
  api: { limit: 120, seconds: 60 },
} satisfies Record<string, Rule>;

/** Requests may carry at most this much body. */
export const MAX_BODY_BYTES = 16 * 1024;
/** Except a saved overlay's (T12.2): its name and its settings, in the link's own form (functions/lib/overlays.ts). */
export const MAX_OVERLAY_BODY_BYTES = 48 * 1024;

const windows = new Map<string, { window: number; count: number }>();

/** Counts one request against `key`. Over the limit: how many seconds until the window resets. */
export function take(
  key: string,
  rule: Rule,
  now = Date.now(),
): { ok: true } | { ok: false; retryAfter: number } {
  const span = rule.seconds * 1000;
  const window = Math.floor(now / span);
  // Old windows are dropped once the map grows, so memory stays small under a flood of IPs.
  if (windows.size > 10_000)
    for (const [k, v] of windows) if (v.window !== window) windows.delete(k);
  const entry = windows.get(key);
  if (!entry || entry.window !== window) {
    windows.set(key, { window, count: 1 });
    return { ok: true };
  }
  if (entry.count >= rule.limit)
    return { ok: false, retryAfter: Math.ceil(((window + 1) * span - now) / 1000) };
  entry.count++;
  return { ok: true };
}
