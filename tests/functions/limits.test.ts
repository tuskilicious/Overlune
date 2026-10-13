import { afterEach, describe, expect, it, vi } from "vitest";
import { abuseLimits } from "../../functions/api/_middleware";
import { MAX_BODY_BYTES, RULES, take } from "../../functions/lib/limits";
import { newSessionToken, SESSION_COOKIE } from "../../functions/lib/session";
import { call } from "./d1";

// Abuse limits (T7.6): each limit trips at its number, says when to come back, and recovers; keys don't share counts.

afterEach(() => vi.useRealTimers());

/** A unique IP per test, so tests never share a count. */
const newIp = () => `203.0.113.${Math.floor(Math.random() * 250)}-${crypto.randomUUID()}`;

const send = (
  path: string,
  { ip, token, length }: { ip: string; token?: string; length?: number },
) =>
  call(abuseLimits, {
    request: new Request(`https://overlune.test${path}`, {
      headers: {
        "CF-Connecting-IP": ip,
        ...(token ? { Cookie: `${SESSION_COOKIE}=${token}` } : {}),
        ...(length === undefined ? {} : { "Content-Length": String(length) }),
      },
    }),
    next: async () => new Response("passed"),
  });

/** Sends `n` requests and returns the statuses: 200 when the route was reached. */
async function burst(n: number, path: string, who: { ip: string; token?: string }) {
  const statuses: number[] = [];
  for (let i = 0; i < n; i++) statuses.push((await send(path, who)).status);
  return statuses;
}

describe("take", () => {
  it("allows the limit, refuses the next with the seconds left, and opens again in the next window", () => {
    const rule = { limit: 3, seconds: 60 };
    const key = `k-${crypto.randomUUID()}`;
    const t = 1_800_000_000_000; // the start of a minute
    expect([0, 1, 2].map(() => take(key, rule, t).ok)).toEqual([true, true, true]);
    expect(take(key, rule, t + 15_000)).toEqual({ ok: false, retryAfter: 45 });
    expect(take(key, rule, t + 60_000).ok).toBe(true);
  });
});

describe("the limits on the API", () => {
  it(`sign-in: ${RULES.signin.limit} a minute per IP, start and callback together, then 429 with Retry-After`, async () => {
    const ip = newIp();
    const half = RULES.signin.limit / 2;
    expect(await burst(half, "/api/auth/twitch", { ip })).toEqual(Array(half).fill(200));
    expect(await burst(half, "/api/auth/twitch/callback", { ip })).toEqual(Array(half).fill(200));
    const res = await send("/api/auth/twitch", { ip });
    expect(res.status).toBe(429);
    expect(await res.json()).toEqual({ error: "too many requests" });
    expect(Number(res.headers.get("Retry-After"))).toBeGreaterThan(0);
    expect(Number(res.headers.get("Retry-After"))).toBeLessThanOrEqual(RULES.signin.seconds);
    // Someone else, from another IP, isn't affected.
    expect((await send("/api/auth/twitch", { ip: newIp() })).status).toBe(200);
  });

  it(`account routes: ${RULES.account.limit} a minute per session, whatever the IP`, async () => {
    const token = newSessionToken();
    const statuses = [
      ...(await burst(RULES.account.limit / 2, "/api/me", { ip: newIp(), token })),
      ...(await burst(RULES.account.limit / 2, "/api/auth/signout", { ip: newIp(), token })),
    ];
    expect(statuses).toEqual(Array(RULES.account.limit).fill(200));
    expect((await send("/api/me", { ip: newIp(), token })).status).toBe(429);
    expect((await send("/api/me", { ip: newIp(), token: newSessionToken() })).status).toBe(200);
  });

  it(`everything else: ${RULES.api.limit} a minute per IP, signed in or not`, async () => {
    const ip = newIp();
    expect(await burst(RULES.api.limit, "/api/health", { ip })).toEqual(
      Array(RULES.api.limit).fill(200),
    );
    expect((await send("/api/nope", { ip })).status).toBe(429);
    expect((await send("/api/health", { ip: newIp() })).status).toBe(200);
  });

  it("recovers once the minute is over", async () => {
    vi.useFakeTimers({ now: 1_800_000_000_000 });
    const ip = newIp();
    await burst(RULES.signin.limit, "/api/auth/twitch", { ip });
    expect((await send("/api/auth/twitch", { ip })).status).toBe(429);
    vi.setSystemTime(1_800_000_000_000 + RULES.signin.seconds * 1000);
    expect((await send("/api/auth/twitch", { ip })).status).toBe(200);
  });

  it(`refuses a body over ${MAX_BODY_BYTES / 1024} KB with a 413, before counting it`, async () => {
    const ip = newIp();
    const big = await send("/api/me", { ip, length: MAX_BODY_BYTES + 1 });
    expect(big.status).toBe(413);
    expect(await big.json()).toEqual({ error: "too large" });
    expect((await send("/api/me", { ip, length: MAX_BODY_BYTES })).status).toBe(200);
  });

  it("passes everything under the limits through untouched", async () => {
    const res = await send("/api/health", { ip: newIp() });
    expect(await res.text()).toBe("passed");
  });
});
