import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Env } from "../../functions/lib/env";
import { onRequestGet as start } from "../../functions/api/auth/twitch/index";
import { onRequestGet as callback } from "../../functions/api/auth/twitch/callback";
import { onRequestPost as signout } from "../../functions/api/auth/signout";
import { onRequestPost as signoutEverywhere } from "../../functions/api/auth/signout-everywhere";
import { onRequestDelete as deleteMe, onRequestGet as getMe } from "../../functions/api/me";
import { accountsGate } from "../../functions/api/_middleware";
import { hashToken, SESSION_COOKIE, SIGNIN_COOKIE } from "../../functions/lib/session";
import { call, localD1, migrate } from "./d1";

// Sign in with Twitch (T7.3) against a real local D1 and a fake Twitch: the fake signs real RS256 ID tokens with a key
// made here, and answers like Twitch does (its token response sends `scope` as a list).

const ORIGIN = "https://overlune.test";
const CLIENT_ID = "client-123";
const ACCESS_TOKEN = "twitch-access-token-never-stored";
const REFRESH_TOKEN = "twitch-refresh-token-never-stored";

let proxy: Awaited<ReturnType<typeof localD1>>;
let env: Env;
let key: CryptoKeyPair;
let otherKey: CryptoKeyPair;
let jwk: JsonWebKey & { kid?: string; alg?: string; use?: string };

/** What the fake Twitch will put in the next ID token, and which key signs it. */
let twitch: { nonce?: string; sub: string; signWith: CryptoKey; aud: string; helixId: string };

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

/** Starts a sign-in: where it sends the browser, and the cookie it sets. */
async function begin() {
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
const back = (query: string, cookie?: string) =>
  call(callback, {
    env,
    request: new Request(`${ORIGIN}/api/auth/twitch/callback?${query}`, {
      headers: cookie ? { Cookie: cookie } : {},
    }),
  });

const sessionCookieOf = (res: Response) =>
  res.headers
    .getSetCookie()
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`) && !c.includes("Max-Age=0"));

const rows = async (table: string) =>
  (await env.DB.prepare(`SELECT * FROM ${table}`).all()).results;

/** A full, successful sign-in: the session token from its cookie. */
async function signIn() {
  const { state, nonce } = await begin();
  twitch.nonce = nonce;
  const res = await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`);
  expect(res.headers.get("Location")).toBe("/editor");
  return /=([^;]+)/.exec(sessionCookieOf(res)!)![1]!;
}

const post = (fn: typeof signout, token: string | null, origin: string | null = ORIGIN) =>
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

describe("starting a sign-in", () => {
  it("sends the browser to Twitch asking only who they are, with a fresh state and nonce", async () => {
    const { res, location, setCookie, state, nonce } = await begin();
    expect(res.status).toBe(302);
    expect(location.origin + location.pathname).toBe("https://id.twitch.tv/oauth2/authorize");
    expect(location.searchParams.get("client_id")).toBe(CLIENT_ID);
    expect(location.searchParams.get("response_type")).toBe("code");
    expect(location.searchParams.get("scope")).toBe("openid");
    expect(location.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/api/auth/twitch/callback`);
    expect(state.length).toBeGreaterThanOrEqual(43);
    expect(nonce.length).toBeGreaterThanOrEqual(43);
    expect((await begin()).state).not.toBe(state);
    // The state and nonce wait in a short-lived cookie only this site can read.
    expect(setCookie).toBe(
      `${SIGNIN_COOKIE}=${state}.${nonce}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=600`,
    );
  });
});

describe("Twitch's callback", () => {
  it("signs the streamer in: an account, a session stored only as a hash, and no Twitch token anywhere", async () => {
    const token = await signIn();
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const [user] = await rows("users");
    expect(user).toMatchObject({
      twitch_id: "123456",
      login: "moonstreamer",
      display_name: "MoonStreamer",
      avatar_url: "https://static-cdn.jtvnw.net/user-default-pictures/a.png",
    });
    const sessions = await rows("sessions");
    expect(sessions.map((s) => s.token_hash)).toContain(await hashToken(token));
    const everything = JSON.stringify([await rows("users"), sessions]);
    expect(everything).not.toContain(token);
    expect(everything).not.toContain(ACCESS_TOKEN);
    expect(everything).not.toContain(REFRESH_TOKEN);
  });

  it("sets the session cookie for 30 days, and clears the sign-in cookie", async () => {
    const { state, nonce } = await begin();
    twitch.nonce = nonce;
    const res = await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`);
    expect(sessionCookieOf(res)).toMatch(
      new RegExp(
        `^${SESSION_COOKIE}=[A-Za-z0-9_-]{43}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000$`,
      ),
    );
    expect(res.headers.getSetCookie()).toContain(
      `${SIGNIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
  });

  it("signing in again keeps one account", async () => {
    await signIn();
    expect(await rows("users")).toHaveLength(1);
  });

  const fails = async (res: Response) => {
    const before = (await rows("sessions")).length;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/editor?signin=failed");
    expect(sessionCookieOf(res)).toBeUndefined();
    expect(res.headers.getSetCookie()).toContain(
      `${SIGNIN_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    expect(await rows("sessions")).toHaveLength(before);
  };

  it("refuses a tampered state", async () => {
    const { state, nonce } = await begin();
    twitch.nonce = nonce;
    await fails(await back(`code=good-code&state=${state}x`, `${SIGNIN_COOKIE}=${state}.${nonce}`));
  });

  it("refuses a replayed callback: the sign-in cookie is gone after the first", async () => {
    const { state, nonce } = await begin();
    twitch.nonce = nonce;
    await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`);
    await fails(await back(`code=good-code&state=${state}`));
  });

  it("refuses a callback this browser didn't start (no sign-in cookie, so no nonce to check)", async () => {
    const { state } = await begin();
    await fails(await back(`code=good-code&state=${state}`));
    await fails(await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}`));
  });

  it("refuses an ID token without the right nonce", async () => {
    const { state, nonce } = await begin();
    twitch.nonce = "someone-elses-nonce";
    await fails(await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`));
    twitch.nonce = undefined;
    await fails(await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`));
  });

  it("refuses an ID token Twitch didn't sign, or meant for another app", async () => {
    const { state, nonce } = await begin();
    twitch.nonce = nonce;
    twitch.signWith = otherKey.privateKey;
    await fails(await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`));
    twitch.signWith = key.privateKey;
    twitch.aud = "another-app";
    await fails(await back(`code=good-code&state=${state}`, `${SIGNIN_COOKIE}=${state}.${nonce}`));
  });

  it("refuses a bad code, the streamer saying no, and a profile for another account", async () => {
    const { state, nonce } = await begin();
    twitch.nonce = nonce;
    const cookie = `${SIGNIN_COOKIE}=${state}.${nonce}`;
    await fails(await back(`code=stolen-code&state=${state}`, cookie));
    await fails(await back(`error=access_denied&state=${state}`, cookie));
    twitch.helixId = "999";
    await fails(await back(`code=good-code&state=${state}`, cookie));
  });
});

describe("signing out", () => {
  it("ends this browser's session and clears its cookie", async () => {
    const token = await signIn();
    const res = await post(signout, token);
    expect(res.status).toBe(204);
    expect(res.headers.get("Set-Cookie")).toBe(
      `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
    );
    expect((await rows("sessions")).map((s) => s.token_hash)).not.toContain(await hashToken(token));
  });

  it("only from Overlune's own pages", async () => {
    const token = await signIn();
    expect((await post(signout, token, null)).status).toBe(403);
    expect((await post(signout, token, "https://evil.example")).status).toBe(403);
    expect((await rows("sessions")).map((s) => s.token_hash)).toContain(await hashToken(token));
  });

  it("everywhere: ends every session of the account, and needs a live one", async () => {
    const first = await signIn();
    const second = await signIn();
    expect((await post(signoutEverywhere, "A".repeat(43))).status).toBe(401); // a forged cookie
    expect((await post(signoutEverywhere, "not a token")).status).toBe(401);
    expect((await post(signoutEverywhere, first, "https://evil.example")).status).toBe(403);
    expect((await post(signoutEverywhere, second)).status).toBe(204);
    expect(await rows("sessions")).toHaveLength(0);
    expect((await post(signoutEverywhere, first)).status).toBe(401);
  });
});

describe("the account (T7.4)", () => {
  const me = (token: string | null) =>
    call(getMe, {
      env,
      request: new Request(`${ORIGIN}/api/me`, {
        headers: token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {},
      }),
    });
  const del = (token: string | null, origin: string | null = ORIGIN) =>
    call(deleteMe, {
      env,
      request: new Request(`${ORIGIN}/api/me`, {
        method: "DELETE",
        headers: {
          ...(origin ? { Origin: origin } : {}),
          ...(token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {}),
        },
      }),
    });

  it("shows the editor only what it needs: no Twitch or internal ids", async () => {
    const res = await me(await signIn());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      login: "moonstreamer",
      displayName: "MoonStreamer",
      avatarUrl: "https://static-cdn.jtvnw.net/user-default-pictures/a.png",
    });
  });

  it("answers 401 when signed out, or with a forged or malformed cookie", async () => {
    for (const token of [null, "A".repeat(43), "not a token"])
      expect((await me(token)).status).toBe(401);
  });

  it("deletes every row of that account, and nobody else's, only from Overlune's own pages", async () => {
    const mine = await signIn();
    await signIn(); // a second session of the same account
    twitch.sub = twitch.helixId = "777";
    const theirs = await signIn(); // someone else
    expect((await del(mine, "https://evil.example")).status).toBe(403);
    expect((await del(null)).status).toBe(401);
    const res = await del(mine);
    expect(res.status).toBe(204);
    expect(res.headers.get("Set-Cookie")).toContain("Max-Age=0");
    expect(await rows("users")).toEqual([expect.objectContaining({ twitch_id: "777" })]);
    const sessions = await rows("sessions");
    expect(sessions.map((s) => s.token_hash)).toEqual([await hashToken(theirs)]);
    expect((await me(mine)).status).toBe(401);
    expect((await me(theirs)).status).toBe(200);
  });

  it("stays closed where accounts aren't open (production until T7.9): every account route is a 404", async () => {
    const gate = (path: string, open?: string) =>
      call(accountsGate, {
        env: { ...env, ACCOUNTS_OPEN: open },
        request: new Request(`${ORIGIN}${path}`),
        next: async () => new Response("passed"),
      });
    for (const path of [
      "/api/me",
      "/api/auth/twitch",
      "/api/auth/twitch/callback",
      "/api/auth/signout",
    ]) {
      expect((await gate(path, "false")).status).toBe(404);
      expect((await gate(path)).status).toBe(404);
      expect(await (await gate(path, "true")).text()).toBe("passed");
    }
    expect(await (await gate("/api/health", "false")).text()).toBe("passed");
  });
});
