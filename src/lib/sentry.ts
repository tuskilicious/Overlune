import * as Sentry from "@sentry/react";
import { useEffect } from "react";
import {
  createRoutesFromChildren,
  matchRoutes,
  useLocation,
  useNavigationType,
} from "react-router";
import { scrubBreadcrumb, scrubEvent } from "./sentry-scrub";

const dsn = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnvironment: string =
  import.meta.env.VITE_SENTRY_ENVIRONMENT ??
  (import.meta.env.DEV ? "development" : "production");

export const sentryEnabled = Boolean(dsn);

/**
 * Sentry setup follows the official React guide (errors + tracing),
 * with Overlune's privacy rules from CLAUDE.md applied:
 * no PII, no URL fragments (settings), no console breadcrumbs (chat text).
 * If VITE_SENTRY_DSN is not set (e.g. local dev), Sentry stays off.
 */
export function initSentry(): void {
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: sentryEnvironment,
    release: import.meta.env.VITE_SENTRY_RELEASE,
    sendDefaultPii: false,

    integrations: [
      Sentry.reactRouterV7BrowserTracingIntegration({
        useEffect,
        useLocation,
        useNavigationType,
        createRoutesFromChildren,
        matchRoutes,
      }),
    ],

    // Overlays run for hours on every streamer's PC, so production samples lightly
    // to stay inside the free quota. Staging/dev trace everything.
    tracesSampleRate: sentryEnvironment === "production" ? 0.05 : 1.0,

    // There is no Overlune backend. Never attach trace headers to third parties (Twitch).
    tracePropagationTargets: [],

    beforeSend: (event) => scrubEvent(event),
    beforeSendTransaction: (event) => scrubEvent(event),
    beforeBreadcrumb: (breadcrumb) => scrubBreadcrumb(breadcrumb),
  });
}
