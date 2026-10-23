import { deleteOverlay, getOverlay, updateOverlay } from "../lib/db";
import { json, type Handler } from "../lib/env";
import { checkSettings, isOverlayId, liveChannel, parseBody, updateBody } from "../lib/overlays";
import { currentUserId, now, sameOrigin } from "../lib/session";

const notFound = () => json({ error: "not found" }, 404);

/** GET /api/overlays/:id (T12.2): one of the signed-in streamer's overlays, with its draft and what OBS shows. Any
 *  other id, theirs or made up, is the same 404. */
export const onRequestGet: Handler = async ({ request, env, params }) => {
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  const overlay = isOverlayId(params.id!) ? await getOverlay(env.DB, userId, params.id!) : null;
  return overlay ? json(overlay) : notFound();
};

/** PATCH /api/overlays/:id: renames it or saves its draft, `{ name?, settings? }`. The body is checked before the
 *  overlay is looked up, so a bad one gets the same 400 whoever the overlay belongs to. */
export const onRequestPatch: Handler = async ({ request, env, params }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  const body = await parseBody(request, updateBody);
  if (body instanceof Response) return body;
  const settings = body.settings === undefined ? undefined : checkSettings(body.settings);
  if (settings === null) return json({ error: "invalid settings" }, 400);
  if (!isOverlayId(params.id!)) return notFound();
  const saved = await updateOverlay(
    env.DB,
    userId,
    params.id!,
    { name: body.name, settings },
    now(),
  );
  return saved ? json(saved) : notFound();
};

/** DELETE /api/overlays/:id: deletes it, and its open copies stop listening (T12.3). */
export const onRequestDelete: Handler = async ({ request, env, params }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  if (!isOverlayId(params.id!) || !(await deleteOverlay(env.DB, userId, params.id!)))
    return notFound();
  await liveChannel(env, params.id!).deleted();
  return new Response(null, { status: 204 });
};
