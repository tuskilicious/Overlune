import * as oauth from "oauth4webapi";
import { z } from "zod";
import type { TwitchProfile } from "./db";
import type { Env } from "./env";

/**
 * Sign in with Twitch (T7.3): the OpenID Connect authorization code flow, through oauth4webapi. Twitch has no PKCE (its
 * discovery document lists no code_challenge_methods), so the browser that started a sign-in is tied to its answer by
 * a state check (CSRF) and a nonce in the signed ID token (replay), and the code is only worth anything with the
 * client secret, which stays on the server. CLAUDE.md §5.
 */

/** From https://id.twitch.tv/oauth2/.well-known/openid-configuration, written out so no request has to fetch it. */
const as: oauth.AuthorizationServer = {
  issuer: "https://id.twitch.tv/oauth2",
  authorization_endpoint: "https://id.twitch.tv/oauth2/authorize",
  token_endpoint: "https://id.twitch.tv/oauth2/token",
  jwks_uri: "https://id.twitch.tv/oauth2/keys",
  id_token_signing_alg_values_supported: ["RS256"],
};

const client = (env: Env): oauth.Client => ({
  client_id: env.TWITCH_CLIENT_ID,
  id_token_signed_response_alg: "RS256",
});

/** The one address Twitch sends people back to. Each Twitch app lists exactly these. */
export const redirectUri = (env: Env) => `${env.AUTH_ORIGIN}/api/auth/twitch/callback`;

/** Where to send someone to sign in. Asks for nothing but who they are: no Twitch permissions. */
export function authorizeUrl(env: Env, state: string, nonce: string): URL {
  const url = new URL(as.authorization_endpoint!);
  url.searchParams.set("client_id", env.TWITCH_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri(env));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid");
  url.searchParams.set("state", state);
  url.searchParams.set("nonce", nonce);
  return url;
}

/** Twitch's user record, checked before it's stored (CLAUDE.md §6): only https pictures. */
const HelixUsers = z.object({
  data: z
    .array(
      z.object({
        id: z.string().regex(/^\d{1,20}$/),
        login: z.string().regex(/^[a-z0-9_]{1,25}$/),
        display_name: z.string().min(1).max(50),
        profile_image_url: z.string().url().startsWith("https://").max(500).or(z.literal("")),
      }),
    )
    .length(1),
});

/** Twitch sends the token response's `scope` as a list, where OAuth says a string (RFC 6749 §5.1), and oauth4webapi
 *  rejects a list. This joins it back; nothing else changes, the ID token included. */
async function standardScope(response: Response): Promise<Response> {
  if (!response.ok) return response;
  const body = (await response.clone().json()) as Record<string, unknown>;
  if (!Array.isArray(body.scope)) return response;
  body.scope = body.scope.join(" ");
  return new Response(JSON.stringify(body), { status: response.status, headers: response.headers });
}

/**
 * Finishes a sign-in from Twitch's callback: checks the state, trades the code for tokens, checks the ID token (its
 * signature against Twitch's keys, issuer, audience, expiry and nonce), then reads the profile once. The access token
 * is used for that one read and dropped: it's never stored or logged. Throws on anything wrong.
 */
export async function finishSignIn(
  env: Env,
  callbackUrl: URL,
  expected: { state: string; nonce: string },
): Promise<TwitchProfile> {
  const params = oauth.validateAuthResponse(as, client(env), callbackUrl, expected.state);
  const response = await standardScope(
    await oauth.authorizationCodeGrantRequest(
      as,
      client(env),
      oauth.ClientSecretPost(env.TWITCH_CLIENT_SECRET),
      params,
      redirectUri(env),
      oauth.nopkce,
    ),
  );
  const tokens = await oauth.processAuthorizationCodeResponse(as, client(env), response, {
    expectedNonce: expected.nonce,
    requireIdToken: true,
  });
  await oauth.validateApplicationLevelSignature(as, response);
  const claims = oauth.getValidatedIdTokenClaims(tokens)!;

  const helix = await fetch("https://api.twitch.tv/helix/users", {
    headers: { Authorization: `Bearer ${tokens.access_token}`, "Client-Id": env.TWITCH_CLIENT_ID },
  });
  if (!helix.ok) throw new Error(`Twitch users: ${helix.status}`);
  const [user] = HelixUsers.parse(await helix.json()).data;
  if (user!.id !== claims.sub) throw new Error("Twitch users: a different account");
  return {
    twitchId: user!.id,
    login: user!.login,
    displayName: user!.display_name,
    avatarUrl: user!.profile_image_url || null,
  };
}
