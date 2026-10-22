import { createOverlay, listOverlays } from "../lib/db";
import { json, type Handler } from "../lib/env";
import { checkSettings, createBody, newOverlayId, OVERLAY_LIMIT, parseBody } from "../lib/overlays";
import { currentUserId, now, sameOrigin } from "../lib/session";

/** GET /api/overlays (T12.2): the signed-in streamer's saved overlays, without their settings, and how many they may
 *  keep. */
export const onRequestGet: Handler = async ({ request, env }) => {
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  return json({ overlays: await listOverlays(env.DB, userId), limit: OVERLAY_LIMIT });
};

/** POST /api/overlays: saves a new overlay, `{ name, settings }`, from Overlune's own pages only. Past the limit, a
 *  409 that says so in plain words. */
export const onRequestPost: Handler = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  const body = await parseBody(request, createBody);
  if (body instanceof Response) return body;
  const settings = checkSettings(body.settings);
  if (!settings) return json({ error: "invalid settings" }, 400);
  const saved = await createOverlay(
    env.DB,
    userId,
    { id: newOverlayId(), name: body.name, settings },
    OVERLAY_LIMIT,
    now(),
  );
  return saved
    ? json(saved, 201)
    : json(
        {
          error: "limit",
          message: `You can save up to ${OVERLAY_LIMIT} overlays. Delete one to save a new one.`,
        },
        409,
      );
};
