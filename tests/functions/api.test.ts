import { getPlatformProxy } from "wrangler";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Env } from "../../functions/lib/env";
import { onRequestGet as health } from "../../functions/api/health";
import { onRequest as fallback } from "../../functions/api/[[path]]";
import { apiHeaders, securityHeaders } from "../../functions/api/_middleware";
import { dataCollection } from "../../src/lib/sentry-scrub";

// The Functions against a real local D1 (T7.2): wrangler's platform proxy runs Miniflare with the bindings from
// wrangler.jsonc, in memory, so every run starts from an empty database.
let proxy: Awaited<ReturnType<typeof getPlatformProxy<Env>>>;
beforeAll(async () => {
  proxy = await getPlatformProxy<Env>({ persist: false });
});
afterAll(() => proxy?.dispose());

/** migrations/, in order, applied as `wrangler d1 migrations apply` does. */
const migrations = import.meta.glob<string>("../../migrations/*.sql", {
  query: "?raw",
  import: "default",
  eager: true,
});
async function migrate(db: Env["DB"]) {
  for (const file of Object.keys(migrations).sort()) {
    const sql = migrations[file]!.replace(/^--.*$/gm, "");
    for (const statement of sql.split(";").map((s: string) => s.trim()))
      if (statement) await db.prepare(statement).run();
  }
}

// A Pages Function only reads what it needs from its context.
type Context = Parameters<typeof health>[0];
const call = async (fn: (c: Context) => unknown, context: object) =>
  (await fn(context as Context)) as Response;

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
    expect(await res.json()).toEqual({ ok: true, schema: "1" });
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
