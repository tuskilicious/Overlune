import type { PagesFunction } from "@cloudflare/workers-types";
import { deleteSession } from "../../lib/db";
import { json, type Env } from "../../lib/env";
import { cookie, hashToken, sameOrigin, SESSION_COOKIE, sessionToken } from "../../lib/session";

/** POST /api/auth/signout (T7.3): ends this browser's session and clears its cookie. Only from Overlune's own pages. */
export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!sameOrigin(request)) return json({ error: "forbidden" }, 403);
  const token = sessionToken(request);
  if (token) await deleteSession(env.DB, await hashToken(token));
  const res = new Response(null, { status: 204 });
  res.headers.append("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
  return res;
};
