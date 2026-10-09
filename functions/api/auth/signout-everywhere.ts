import type { PagesFunction } from "@cloudflare/workers-types";
import { deleteUserSessions, sessionUserId } from "../../lib/db";
import { json, type Env } from "../../lib/env";
import {
  cookie,
  hashToken,
  now,
  sameOrigin,
  SESSION_COOKIE,
  sessionToken,
} from "../../lib/session";

/** POST /api/auth/signout-everywhere (T7.3): ends every session of the signed-in account, on every device. Only from
 *  Overlune's own pages, and only for a live session. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const token = sessionToken(request);
  const userId = token ? await sessionUserId(env.DB, await hashToken(token), now()) : null;
  if (!userId) return json({ error: "signed out" }, 401);
  await deleteUserSessions(env.DB, userId);
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
  return res;
};
