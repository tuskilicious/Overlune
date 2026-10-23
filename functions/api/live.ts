import { json, type Handler } from "../lib/env";
import { isOverlayId, liveChannel } from "../lib/overlays";

/** GET /api/live/:id (T12.3): a saved overlay's read-only live connection, a WebSocket handed to its channel. No
 *  sign-in: an overlay in OBS has none, and the id only reads what its links already show. */
export const onRequestGet: Handler = ({ request, env, params }) => {
  if (request.headers.get("Upgrade") !== "websocket") return json({ error: "websocket only" }, 426);
  return isOverlayId(params.id!)
    ? liveChannel(env, params.id!).fetch(request)
    : json({ error: "not found" }, 404);
};
