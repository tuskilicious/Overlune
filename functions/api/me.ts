import { deleteUser, overlayIds, profile } from "../lib/db";
import { json, type Handler } from "../lib/env";
import { liveChannel } from "../lib/overlays";
import { cookie, currentUserId, sameOrigin, SESSION_COOKIE } from "../lib/session";

/** GET /api/me (T7.4): who's signed in, with only what the editor shows. Signed out, an empty 204, the same for every
 *  missing, forged, expired or deleted session: asking whether you're signed in isn't an error, so the browser
 *  doesn't log one for every signed-out visitor (2026-10-20). Everything else that needs an account still says 401. */
export const onRequestGet: Handler = async ({ request, env }) => {
  const userId = await currentUserId(request, env);
  const me = userId ? await profile(env.DB, userId) : null;
  return me ? json(me) : new Response(null, { status: 204 });
};

/** DELETE /api/me (T7.4): deletes the account and everything that belongs to it, then signs this browser out. Only
 *  from Overlune's own pages, and only for the signed-in account itself. */
export const onRequestDelete: Handler = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  const overlays = await overlayIds(env.DB, userId);
  await deleteUser(env.DB, userId);
  // Their saved overlays' open copies stop listening (T12.3).
  await Promise.all(overlays.map((id) => liveChannel(env, id).deleted()));
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
  return res;
};
