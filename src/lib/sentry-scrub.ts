import type { Breadcrumb, Event } from "@sentry/react";

/**
 * Overlay settings live in the URL fragment (#...). They must never reach Sentry.
 * See CLAUDE.md §7 and docs/SENTRY.md.
 */
export function stripFragment(url: string): string {
  const i = url.indexOf("#");
  return i === -1 ? url : url.slice(0, i);
}

const DENIED = ["forwarded", "-ip", "remote-", "via", "-user", "authorization", "cookie"];

/**
 * Sentry 11 replaced sendDefaultPii with dataCollection, and leaving it unset collects MORE (user info, cookies,
 * bodies). This is the documented v10 baseline, written out, so nothing new is collected (T6.98), plus sign-in headers
 * and cookies denied by name for the API (T7.2). The site and the API both use it.
 */
export const dataCollection = {
  userInfo: false,
  cookies: false,
  httpHeaders: { request: { deny: DENIED }, response: { deny: DENIED } },
  httpBodies: [],
  urlQueryParams: { deny: DENIED },
  genAI: { inputs: false, outputs: false },
  databaseQueryData: false,
  queues: false,
  graphQL: { document: false, variables: false },
};

const URL_KEYS = ["url", "from", "to"] as const;

export function scrubBreadcrumb(breadcrumb: Breadcrumb): Breadcrumb | null {
  // Console output can contain chat text or settings. Don't send it.
  if (breadcrumb.category === "console") return null;

  if (breadcrumb.data) {
    const data = { ...breadcrumb.data };
    for (const key of URL_KEYS) {
      const value = data[key];
      if (typeof value === "string") data[key] = stripFragment(value);
    }
    return { ...breadcrumb, data };
  }
  return breadcrumb;
}

/** A fragment on anything URL-shaped, and a settings payload ("#1.…") anywhere at all. */
const URL_FRAGMENT = /(\b[a-z][a-z0-9+.-]*:\/\/[^\s#"'<>]*)#[^\s"'<>]*/gi;
const SETTINGS = /#\d+\.[\w+$-]*/g;

/** Every string in the event, however deep: Sentry adds fields over time (T6.99 found `url.full` on page-load spans).
 *  Safe with shared or circular objects. `sdkProcessingMetadata` is Sentry's own bookkeeping and is never sent. */
function scrubDeep(value: unknown, seen: WeakSet<object>): unknown {
  if (typeof value === "string") return value.replace(URL_FRAGMENT, "$1").replace(SETTINGS, "");
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i++) value[i] = scrubDeep(value[i], seen);
    return value;
  }
  const obj = value as Record<string, unknown>;
  for (const key of Object.keys(obj))
    if (key !== "sdkProcessingMetadata") obj[key] = scrubDeep(obj[key], seen);
  return value;
}

/** Returns the scrubbed event, or null to drop it: if scrubbing ever fails, nothing unscrubbed is sent. */
export function scrubEvent<T extends Event>(event: T): T | null {
  try {
    if (event.breadcrumbs) {
      event.breadcrumbs = event.breadcrumbs
        .map(scrubBreadcrumb)
        .filter((b): b is Breadcrumb => b !== null);
    }
    return scrubDeep(event, new WeakSet()) as T;
  } catch {
    return null;
  }
}
