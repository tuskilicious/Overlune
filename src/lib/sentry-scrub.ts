import type { Breadcrumb, Event } from "@sentry/react";

/**
 * Overlay settings live in the URL fragment (#...). They must never reach Sentry.
 * See CLAUDE.md §7 and docs/SENTRY.md.
 */
export function stripFragment(url: string): string {
  const i = url.indexOf("#");
  return i === -1 ? url : url.slice(0, i);
}

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

export function scrubEvent<T extends Event>(event: T): T {
  if (event.request?.url) {
    event.request.url = stripFragment(event.request.url);
  }
  if (event.breadcrumbs) {
    event.breadcrumbs = event.breadcrumbs
      .map(scrubBreadcrumb)
      .filter((b): b is Breadcrumb => b !== null);
  }
  return event;
}
