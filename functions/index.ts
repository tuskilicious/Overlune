import { withSentry } from "@sentry/cloudflare";
import type { ExportedHandler } from "@cloudflare/workers-types";
import { version } from "../package.json";
import { dataCollection, scrubBreadcrumb, scrubEvent } from "../src/lib/sentry-scrub";
import { abuseLimits, accountsGate, securityHeaders } from "./api/_middleware";
import type { Env, Handler } from "./lib/env";
import { route } from "./router";

export { OverlayLive } from "./live";

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
