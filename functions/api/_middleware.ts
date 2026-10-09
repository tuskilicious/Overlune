import type { PagesFunction } from "@cloudflare/workers-types";
import { sentryPagesPlugin } from "@sentry/cloudflare";
import { version } from "../../package.json";
import { dataCollection, scrubBreadcrumb, scrubEvent } from "../../src/lib/sentry-scrub";
import type { Env } from "../lib/env";

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

/** Every /api request: Sentry first, with the site's privacy rules and scrubber (no PII, no settings fragments), so
 *  it sees errors from everything after it; then the headers. Without a DSN (local development) Sentry stays off. */
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
];
