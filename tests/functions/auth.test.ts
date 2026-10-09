import { describe, expect, it } from "vitest";
import { onRequestPost as signout } from "../../functions/api/auth/signout";
import { onRequestPost as signoutEverywhere } from "../../functions/api/auth/signout-everywhere";
import { onRequestDelete as deleteMe, onRequestGet as getMe } from "../../functions/api/me";
import { accountsGate } from "../../functions/api/_middleware";
import { hashToken, SESSION_COOKIE, SIGNIN_COOKIE } from "../../functions/lib/session";
import { call } from "./d1";
import {
  ACCESS_TOKEN,
  back,
  begin,
  CLIENT_ID,
  env,
  key,
  ORIGIN,
  otherKey,
  post,
  REFRESH_TOKEN,
  rows,
  sessionCookieOf,
  signIn,
  twitch,
  withFakeTwitch,
} from "./twitch-fake";

// Sign in with Twitch (T7.3) and the account (T7.4) against a real local D1 and the fake Twitch.
withFakeTwitch();

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
