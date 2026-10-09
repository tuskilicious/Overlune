import type { PagesFunction } from "@cloudflare/workers-types";
import * as oauth from "oauth4webapi";
import { redirect, type Env } from "../../../lib/env";
import { cookie, SIGNIN_COOKIE, SIGNIN_SECONDS } from "../../../lib/session";
import { authorizeUrl } from "../../../lib/twitch";

/** GET /api/auth/twitch (T7.3): starts Sign in with Twitch. A fresh state and nonce ride along in a short-lived cookie
 *  that only this site can read, and come back to be checked. */
export const onRequestGet: PagesFunction<Env> = ({ env }) => {
  const state = oauth.generateRandomState();
  const nonce = oauth.generateRandomNonce();
  return redirect(authorizeUrl(env, state, nonce).href, [
    cookie(SIGNIN_COOKIE, `${state}.${nonce}`, SIGNIN_SECONDS),
  ]);
};
