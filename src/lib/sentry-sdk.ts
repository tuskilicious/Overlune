import * as Sentry from "@sentry/react";
import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub";

/**
 * The Sentry SDK, in its own chunk that loads after the page has drawn (T6.93; see sentry.ts). Set up per the
 * official React guide (errors + tracing), with Overlune's privacy rules from CLAUDE.md: no PII, no URL fragments
 * (settings), no console breadcrumbs (chat text). Returns how to report an error.
 */
export function initSentry(dsn: string, environment: string) {
  Sentry.init({
    dsn,
    environment,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,
    // Transactions are named by path (/o/chat, /editor): the same as the route patterns, as Overlune has no params
    // worth grouping except /o/:overlay.
    integrations: [Sentry.browserTracingIntegration()],

    // Overlays run for hours on every streamer's PC, so production samples lightly
    // to stay inside the free quota. Staging/dev trace everything.
    tracesSampleRate: environment === "production" ? 0.05 : 1.0,

    // There is no Overlune backend. Never attach trace headers to third parties (Twitch).
    tracePropagationTargets: [],

    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });
  return (error: unknown, componentStack?: string) =>
    Sentry.captureException(
      error,
      componentStack ? { contexts: { react: { componentStack } } } : undefined,
    );
}
