import type { PagesFunction } from "@cloudflare/workers-types";
import { deleteUser, profile } from "../lib/db";
import { json, type Env } from "../lib/env";
import { cookie, currentUserId, sameOrigin, SESSION_COOKIE } from "../lib/session";

/** GET /api/me (T7.4): who's signed in, with only what the editor shows. 401 when signed out. */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const userId = await currentUserId(request, env);
  const me = userId ? await profile(env.DB, userId) : null;
  return me ? json(me) : json({ error: "signed out" }, 401);
};

/** DELETE /api/me (T7.4): deletes the account and everything that belongs to it, then signs this browser out. Only
 *  from Overlune's own pages, and only for the signed-in account itself. */
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const userId = await currentUserId(request, env);
  if (!userId) return json({ error: "signed out" }, 401);
  await deleteUser(env.DB, userId);
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
  return res;
};
