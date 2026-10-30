import { publishedOverlay } from "../lib/db";
import { json, type Handler } from "../lib/env";
import { isOverlayId, liveChannel } from "../lib/overlays";

/** GET /api/live/:id (T12.3): a saved overlay's read-only live connection, a WebSocket handed to its channel. No
 *  sign-in: an overlay in OBS has none, and the id only reads what its links already show. Asked plainly, it says
 *  whether the overlay is still there (426, connect with a WebSocket) or gone (404), so a client whose connection
 *  failed knows whether to try again (T12.4). */
export const onRequestGet: Handler = async ({ request, env, params }) => {
  const id = params.id!;
  if (!isOverlayId(id)) return json({ error: "not found" }, 404);
  if (request.headers.get("Upgrade") === "websocket") return liveChannel(env, id).fetch(request);
  return (await publishedOverlay(env.DB, id))
    ? json({ error: "websocket only" }, 426)
    : json({ error: "not found" }, 404);
};
