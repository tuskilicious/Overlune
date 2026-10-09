import type { PagesFunction } from "@cloudflare/workers-types";
import { createSession, upsertUser } from "../../../lib/db";
import { redirect, type Env } from "../../../lib/env";
import {
  cookie,
  hashToken,
  newSessionToken,
  now,
  readCookie,
  SESSION_COOKIE,
  SESSION_SECONDS,
  SIGNIN_COOKIE,
} from "../../../lib/session";
import { finishSignIn } from "../../../lib/twitch";

/**
 * GET /api/auth/twitch/callback (T7.3): Twitch sends the streamer back here. The sign-in cookie is cleared whatever
 * happens, so a callback can't be replayed. Any failure (a tampered state, a missing cookie, a bad token, the streamer
 * saying no) just goes back to the editor signed out, with no detail for an attacker.
 */
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const clear = cookie(SIGNIN_COOKIE, "", 0);
  const failed = () => redirect("/editor?signin=failed", [clear]);
  const [state, nonce, ...rest] = (readCookie(request, SIGNIN_COOKIE) ?? "").split(".");
  if (!state || !nonce || rest.length) return failed();

  let userId: string;
  try {
    const profile = await finishSignIn(env, new URL(request.url), { state, nonce });
    userId = await upsertUser(env.DB, profile, now());
  } catch {
    return failed();
  }
  const token = newSessionToken();
  await createSession(env.DB, userId, await hashToken(token), now(), now() + SESSION_SECONDS);
  return redirect("/editor", [clear, cookie(SESSION_COOKIE, token, SESSION_SECONDS)]);
};
