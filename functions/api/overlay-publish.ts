import { publishOverlay } from "../lib/db";
import { json, type Handler } from "../lib/env";
import { isOverlayId, liveChannel } from "../lib/overlays";
import { currentUserId, now, sameOrigin } from "../lib/session";

/** POST /api/overlays/:id/publish (T12.2): "Update OBS". The draft becomes what the overlay's links show, under the
 *  next version, and every open copy gets it through the live channel (T12.3). */
export const onRequestPost: Handler = async ({ request, env, params }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  const published = isOverlayId(params.id!)
    ? await publishOverlay(env.DB, userId, params.id!, now())
    : null;
  if (!published) return json({ error: "not found" }, 404);
  await liveChannel(env, params.id!).publish(published.summary.version, published.settings);
  return json(published.summary);
};
