import { withSentry } from "@sentry/cloudflare";
import type { ExportedHandler } from "@cloudflare/workers-types";
import { version } from "../package.json";
import { dataCollection, scrubBreadcrumb, scrubEvent } from "../src/lib/sentry-scrub";
import { onRequest as notFound } from "./api/[[path]]";
import { abuseLimits, accountsGate, securityHeaders } from "./api/_middleware";
import { onRequestPost as signout } from "./api/auth/signout";
import { onRequestPost as signoutEverywhere } from "./api/auth/signout-everywhere";
import { onRequestGet as callback } from "./api/auth/twitch/callback";
import { onRequestGet as start } from "./api/auth/twitch/index";
import { onRequestGet as health } from "./api/health";
import { onRequestDelete as deleteMe, onRequestGet as getMe } from "./api/me";
import { onRequestPost as publishOverlay } from "./api/overlay-publish";
import {
  onRequestDelete as deleteOverlay,
  onRequestGet as getOverlay,
  onRequestPatch as updateOverlay,
} from "./api/overlay";
import { onRequestGet as listOverlays, onRequestPost as createOverlay } from "./api/overlays";
import type { Env, Handler } from "./lib/env";

/** The whole API (T12.1): each path and its methods; `:name` matches one part of a path. tests/functions/access.test.ts
 *  checks this table against its own registry, so no route ships without its access tests. Anything else is a JSON
 *  404: default deny. */
export const routes: Record<string, Partial<Record<string, Handler>>> = {
  "/api/health": { GET: health },
  "/api/me": { GET: getMe, DELETE: deleteMe },
  "/api/auth/twitch": { GET: start },
  "/api/auth/twitch/callback": { GET: callback },
  "/api/auth/signout": { POST: signout },
  "/api/auth/signout-everywhere": { POST: signoutEverywhere },
  "/api/overlays": { GET: listOverlays, POST: createOverlay },
  "/api/overlays/:id": { GET: getOverlay, PATCH: updateOverlay, DELETE: deleteOverlay },
  "/api/overlays/:id/publish": { POST: publishOverlay },
};

/** The handler for a request's path and method, with the path's `:name` parts, or the 404. */
export function route(request: Request): { handler: Handler; params: Record<string, string> } {
  const parts = new URL(request.url).pathname.split("/");
  for (const [pattern, methods] of Object.entries(routes)) {
    const want = pattern.split("/");
    const params: Record<string, string> = {};
    const match =
      want.length === parts.length &&
      want.every((w, i) =>
        w.startsWith(":") ? parts[i] !== "" && (params[w.slice(1)] = parts[i]!) : w === parts[i],
      );
    if (match) return { handler: methods[request.method] ?? notFound, params };
  }
  return { handler: notFound, params: {} };
}

/** The security headers, then the abuse limits, then the accounts and saved-overlays switches, then the route. */
function api(request: Request, env: Env): Promise<Response> {
  const { handler, params } = route(request);
  const chain: Handler[] = [securityHeaders, abuseLimits, accountsGate, handler];
  const run = (i: number): Promise<Response> =>
    Promise.resolve(chain[i]!({ request, env, params, next: () => run(i + 1) }));
  return run(0);
}

/** The Worker. Only /api/* reaches it (wrangler.jsonc, `run_worker_first`); every other path is a static file or the
 *  404 page. Sentry wraps it all with the site's privacy rules and scrubber (no PII, no settings fragments); without a
 *  DSN (local development) it stays off. */
export default withSentry<Env>(
  (env) => ({
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
  }),
  {
    fetch: (request, env) => api(request, env),
  } satisfies ExportedHandler<Env>,
);
