import { withSentry } from "@sentry/cloudflare";
import type { ExecutionContext, ExportedHandler, PagesFunction } from "@cloudflare/workers-types";
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
import type { Env } from "./lib/env";

// ponytail: the handlers keep Pages' function shape from T7, and the router hands them that context. Give them a
// Worker-native type when T12.2 adds routes with ids in their paths.
type Handler = PagesFunction<Env>;

/** The whole API (T12.1): each path and its methods. tests/functions/access.test.ts checks this table against its own
 *  registry, so no route ships without its access tests. Anything else is a JSON 404: default deny. */
export const routes: Record<string, Partial<Record<string, Handler>>> = {
  "/api/health": { GET: health },
  "/api/me": { GET: getMe, DELETE: deleteMe },
  "/api/auth/twitch": { GET: start },
  "/api/auth/twitch/callback": { GET: callback },
  "/api/auth/signout": { POST: signout },
  "/api/auth/signout-everywhere": { POST: signoutEverywhere },
};

/** The route for a request's path and method, or the 404. */
export const route = (request: Request): Handler =>
  routes[new URL(request.url).pathname]?.[request.method] ?? notFound;

/** The security headers, then the abuse limits, then the accounts switch, then the route, as under Pages. */
async function api(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const chain: Handler[] = [securityHeaders, abuseLimits, accountsGate, route(request)];
  const run = (i: number): Promise<Response> =>
    Promise.resolve(
      chain[i]!({
        request,
        env,
        next: () => run(i + 1),
        params: {},
        data: {},
        waitUntil: (p: Promise<unknown>) => ctx.waitUntil(p),
      } as unknown as Parameters<Handler>[0]) as unknown as Response,
    );
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
    fetch: (request, env, ctx) => api(request, env, ctx),
  } satisfies ExportedHandler<Env>,
);
