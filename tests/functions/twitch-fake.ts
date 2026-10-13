import { afterAll, beforeAll, beforeEach, expect, vi } from "vitest";
import type { Env } from "../../functions/lib/env";
import { onRequestGet as start } from "../../functions/api/auth/twitch/index";
import { onRequestGet as callback } from "../../functions/api/auth/twitch/callback";
import { onRequestPost as signout } from "../../functions/api/auth/signout";
import { SESSION_COOKIE, SIGNIN_COOKIE } from "../../functions/lib/session";
import { call, localD1, migrate } from "./d1";

// A fake Twitch for the Function tests (T7.3, shared since T7.5), over a real local D1: it signs real RS256 ID tokens
// with a key made here, and answers like Twitch does (its token response sends `scope` as a list). `twitch` says what
// the next answer holds; it's reset before every test.

export const ORIGIN = "https://overlune.test";
export const CLIENT_ID = "client-123";
export const ACCESS_TOKEN = "twitch-access-token-never-stored";
export const REFRESH_TOKEN = "twitch-refresh-token-never-stored";

export let proxy: Awaited<ReturnType<typeof localD1>>;
export let env: Env;
export let key: CryptoKeyPair;
export let otherKey: CryptoKeyPair;
let jwk: JsonWebKey & { kid?: string; alg?: string; use?: string };

/** What the fake Twitch will put in the next ID token, and which key signs it. */
export let twitch: {
  nonce?: string;
  sub: string;
  signWith: CryptoKey;
  aud: string;
  helixId: string;
};

const b64url = (data: string | ArrayBuffer) =>
  Buffer.from(typeof data === "string" ? data : new Uint8Array(data)).toString("base64url");

async function idToken(claims: Record<string, unknown>, signWith: CryptoKey) {
  const head = b64url(JSON.stringify({ alg: "RS256", kid: "k1", typ: "JWT" }));
  const body = b64url(JSON.stringify(claims));
  const sig = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    signWith,
    new TextEncoder().encode(`${head}.${body}`),
  );
  return `${head}.${body}.${b64url(sig)}`;
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const realFetch = globalThis.fetch;
async function fakeTwitch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  if (url === "https://id.twitch.tv/oauth2/token") {
    const form = new URLSearchParams(String(init?.body));
    if (form.get("client_secret") !== "secret-456" || form.get("code") !== "good-code")
      return jsonResponse({ status: 400, message: "Invalid authorization code" }, 400);
    const now = Math.floor(Date.now() / 1000);
    return jsonResponse({
      access_token: ACCESS_TOKEN,
      refresh_token: REFRESH_TOKEN,
      expires_in: 14000,
      scope: ["openid"],
      token_type: "bearer",
      id_token: await idToken(
        {
          iss: "https://id.twitch.tv/oauth2",
          aud: twitch.aud,
          azp: CLIENT_ID,
          sub: twitch.sub,
          iat: now,
          exp: now + 900,
          ...(twitch.nonce === undefined ? {} : { nonce: twitch.nonce }),
        },
        twitch.signWith,
      ),
    });
  }
  if (url === "https://id.twitch.tv/oauth2/keys") return jsonResponse({ keys: [jwk] });
  if (url === "https://api.twitch.tv/helix/users") {
    const headers = new Headers(init?.headers);
    if (headers.get("Authorization") !== `Bearer ${ACCESS_TOKEN}`) return jsonResponse({}, 401);
    return jsonResponse({
      data: [
        {
          id: twitch.helixId,
          login: "moonstreamer",
          display_name: "MoonStreamer",
          profile_image_url: "https://static-cdn.jtvnw.net/user-default-pictures/a.png",
        },
      ],
    });
  }
  return realFetch(input, init);
}

/** Registers the hooks: a migrated local D1, the fake Twitch in place of fetch, and a fresh Twitch answer per test. */
export function withFakeTwitch() {
  beforeAll(async () => {
    proxy = await localD1();
    await migrate(proxy.env.DB);
    env = {
      ...proxy.env,
      AUTH_ORIGIN: ORIGIN,
      TWITCH_CLIENT_ID: CLIENT_ID,
      TWITCH_CLIENT_SECRET: "secret-456",
    };
    const params = {
      name: "RSASSA-PKCS1-v1_5",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    };
    key = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
    otherKey = (await crypto.subtle.generateKey(params, true, ["sign", "verify"])) as CryptoKeyPair;
    jwk = {
      ...((await crypto.subtle.exportKey("jwk", key.publicKey)) as JsonWebKey),
      kid: "k1",
      alg: "RS256",
      use: "sig",
    };
    vi.stubGlobal("fetch", fakeTwitch);
  });
  afterAll(async () => {
    vi.unstubAllGlobals();
    await proxy?.dispose();
  });
  beforeEach(() => {
    twitch = { sub: "123456", signWith: key.privateKey, aud: CLIENT_ID, helixId: "123456" };
  });
}

/** Starts a sign-in: where it sends the browser, and the cookie it sets. */
export async function begin() {
  const res = await call(start, { env });
  const location = new URL(res.headers.get("Location")!);
  const setCookie = res.headers.get("Set-Cookie")!;
  return {
    res,
    location,
    setCookie,
    state: location.searchParams.get("state")!,
    nonce: location.searchParams.get("nonce")!,
  };
}

/** Twitch sending the browser back to the callback. */
export const back = (query: string, cookie?: string) =>
  call(callback, {
    env,
    request: new Request(`${ORIGIN}/api/auth/twitch/callback?${query}`, {
      headers: cookie ? { Cookie: cookie } : {},
    }),
  });

export const sessionCookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`) && !c.includes("Max-Age=0"));

export const rows = async (table: string) =>
  (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;

/** A full, successful sign-in: the session token from its cookie. */
export async function signIn() {
  const { state, nonce } = await begin();
  twitch.nonce = nonce;
  const res = await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`);
  expect(res.headers.get("Location")).toBe("/editor");
  return /=([^;]+)/.exec(sessionCookieOf(res)!)![1]!;
}

export const post = (fn: typeof signout, token: string | null, origin: string | null = ORIGIN) =>
  call(fn, {
    env,
    request: new Request(`${ORIGIN}/api/auth/x`, {
      method: "POST",
      headers: {
        ...(origin ? { Origin: origin } : {}),
        ...(token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {}),
      },
    }),
  });
