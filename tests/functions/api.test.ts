import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { call, localD1, migrate } from "./d1";
import { onRequestGet as health } from "../../functions/api/health";
import { onRequest as fallback } from "../../functions/api/[[path]]";
import { apiHeaders, securityHeaders } from "../../functions/api/_middleware";
import { dataCollection } from "../../src/lib/sentry-scrub";

let proxy: Awaited<ReturnType<typeof localD1>>;
beforeAll(async () => {
  proxy = await localD1();
});
afterAll(() => proxy?.dispose());

describe("GET /api/health", () => {
  it("says it can't serve before the migrations have run, without details", async () => {
    const res = await call(health, { env: proxy.env });
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false });
  });

  it("answers with the schema version once they have", async () => {
    await migrate(proxy.env.DB);
    const res = await call(health, { env: proxy.env });
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(await res.json()).toEqual({ ok: true, schema: "2" });
  });
});

describe("the rest of /api", () => {
  it("answers anything without its own Function with a JSON 404, never the site's HTML", async () => {
    const res = await call(fallback, { env: proxy.env });
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not found" });
  });

  it("puts the security headers on every answer and keeps its status and body", async () => {
    const res = await call(securityHeaders, {
      next: async () => new Response("teapot", { status: 418 }),
    });
    expect(res.status).toBe(418);
    expect(await res.text()).toBe("teapot");
    for (const [name, value] of Object.entries(apiHeaders))
      expect(res.headers.get(name)).toBe(value);
    expect(apiHeaders["Content-Security-Policy"]).toContain("default-src 'none'");
    expect(apiHeaders["Cache-Control"]).toBe("no-store");
  });

  it("never sends who someone is to Sentry: no user info, cookies, bodies or sign-in headers", () => {
    expect(dataCollection.userInfo).toBe(false);
    expect(dataCollection.cookies).toBe(false);
    expect(dataCollection.httpBodies).toEqual([]);
    expect(dataCollection.httpHeaders.request.deny).toEqual(
      expect.arrayContaining(["authorization", "cookie"]),
    );
  });
});
