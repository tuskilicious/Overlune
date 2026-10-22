// The API's route table (T12.1), apart from the Worker's entry (index.ts) so Node tests can load it: the entry also
// exports the Durable Object, whose `cloudflare:workers` module only exists in the Workers runtime.
import { onRequest as notFound } from "./api/[[path]]";
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
import { onRequestGet as live } from "./api/live";
import type { Handler } from "./lib/env";

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
  "/api/live/:id": { GET: live },
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
