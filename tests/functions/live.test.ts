import { mkdirSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { createTestHarness } from "wrangler";
import type { Env } from "../../functions/lib/env";
import { newOverlayId } from "../../functions/lib/overlays";
import { hashToken, newSessionToken, SESSION_COOKIE } from "../../functions/lib/session";
import { defaultSettings } from "../../src/settings/schema";
import { followLive } from "../../src/lib/live";
import { encode } from "../../src/settings/url";
import { migrate } from "./d1";

// Saved overlays' live channels (T12.3), run for real: the Worker and its Durable Object in workerd, from
// wrangler.jsonc, with a local database. Node's own WebSocket plays the overlay in OBS.

const draft = encode({ ...defaultSettings, theme: "rain-city" });
const published = encode({ ...defaultSettings, theme: "paper-cut" });
const token = newSessionToken();

let harness: ReturnType<typeof createTestHarness>;
let base: URL;
let db: Env["DB"];

beforeAll(async () => {
  // The config serves dist/ as static files; CI runs these tests before it builds.
  mkdirSync("dist", { recursive: true });
  harness = createTestHarness({
    workers: [
      {
        configPath: "wrangler.jsonc",
        // Never report a test's errors to the real Sentry, whose DSN is in the config.
        vars: {
          SAVED_OVERLAYS_OPEN: "true",
          ACCOUNTS_OPEN: "true",
          VITE_SENTRY_DSN: "",
          VITE_SENTRY_ENVIRONMENT: "test",
        },
      },
    ],
  });
  ({ url: base } = await harness.listen());
  db = ((await harness.getWorker().getEnv()) as Env).DB;
  await migrate(db);
  await db.prepare("INSERT INTO users VALUES ('u1', '111', 'moon', 'Moon', NULL, 1)").run();
  await db
    .prepare("INSERT INTO sessions VALUES (?, 'u1', 1, 9999999999)")
    .bind(await hashToken(token))
    .run();
}, 120_000);

afterAll(async () => {
  await harness?.close();
});

/** A saved overlay of the signed-in user's: its id. */
async function overlay(publishedSettings: string | null, version = publishedSettings ? 3 : 0) {
  const id = newOverlayId();
  await db
    .prepare("INSERT INTO overlays VALUES (?, 'u1', 'Live test', ?, ?, ?, ?, 1, 1)")
    .bind(id, draft, publishedSettings, publishedSettings ? 1 : null, version)
    .run();
  return id;
}

/** An overlay's live connection, as OBS would hold it: what it receives, and how it ends. */
function connect(id: string) {
  const ws = new WebSocket(`ws://${base.host}/api/live/${id}`);
  const messages: string[] = [];
  const waiting: ((m: string) => void)[] = [];
  ws.addEventListener("message", (e) => {
    const m = String(e.data);
    const w = waiting.shift();
    if (w) w(m);
    else messages.push(m);
  });
  const opened = new Promise<void>((resolve, reject) => {
    ws.addEventListener("open", () => resolve());
    ws.addEventListener("error", () => reject(new Error("no connection")));
  });
  const closed = new Promise<number>((resolve) =>
    ws.addEventListener("close", (e) => resolve(e.code)),
  );
  /** The next message, or a failure after `ms`. */
  const next = (ms = 2000) =>
    messages.length
      ? Promise.resolve(messages.shift()!)
      : new Promise<string>((resolve, reject) => {
          const waiter = (m: string) => {
            clearTimeout(timer);
            resolve(m);
          };
          const timer = setTimeout(() => {
            waiting.splice(waiting.indexOf(waiter), 1);
            reject(new Error(`nothing within ${ms} ms`));
          }, ms);
          waiting.push(waiter);
        });
  return { ws, opened, closed, next, messages };
}

const asOwner = (method: string, path: string) =>
  fetch(new URL(path, base), {
    method,
    headers: { Cookie: `${SESSION_COOKIE}=${token}`, Origin: base.origin },
  });

const sockets: WebSocket[] = [];
beforeEach(() => {
  for (const ws of sockets.splice(0)) ws.close();
});

describe("an overlay's live connection", () => {
  it("gets what's published as it opens, never the draft", async () => {
    const live = connect(await overlay(published));
    sockets.push(live.ws);
    await live.opened;
    expect(JSON.parse(await live.next())).toEqual({ version: 3, settings: published });
  });

  it("hears nothing before the first Update OBS, then the new version in under two seconds", async () => {
    const id = await overlay(null);
    const live = connect(id);
    sockets.push(live.ws);
    await live.opened;
    await expect(live.next(300)).rejects.toThrow("nothing within");
    const start = performance.now();
    expect((await asOwner("POST", `/api/overlays/${id}/publish`)).status).toBe(200);
    expect(JSON.parse(await live.next())).toEqual({ version: 1, settings: draft });
    expect(performance.now() - start).toBeLessThan(2000);
  });

  it("reaches 20 open copies at once", async () => {
    const id = await overlay(null);
    const copies = Array.from({ length: 20 }, () => connect(id));
    sockets.push(...copies.map((c) => c.ws));
    await Promise.all(copies.map((c) => c.opened));
    const start = performance.now();
    await asOwner("POST", `/api/overlays/${id}/publish`);
    const got = await Promise.all(copies.map((c) => c.next()));
    const ms = performance.now() - start;
    for (const m of got) expect(JSON.parse(m)).toMatchObject({ version: 1 });
    expect(ms).toBeLessThan(2000);
  });

  it("stays open while the channel is out of memory, and still gets the next publish", async () => {
    const id = await overlay(published);
    const live = connect(id);
    sockets.push(live.ws);
    await live.opened;
    await live.next();
    await harness.getWorker<Env>().evictDurableObject("LIVE", { name: id });
    await asOwner("POST", `/api/overlays/${id}/publish`);
    expect(JSON.parse(await live.next())).toEqual({ version: 4, settings: draft });
  });

  it("is read-only: the keep-alive ping gets a pong, anything else closes it", async () => {
    const id = await overlay(published);
    const live = connect(id);
    await live.opened;
    await live.next();
    live.ws.send("ping");
    expect(await live.next()).toBe("pong");
    live.ws.send(JSON.stringify({ version: 99, settings: draft }));
    expect(await live.closed).toBe(1008);
    // Nothing it sent changed the overlay.
    expect(
      await db.prepare("SELECT published, version FROM overlays WHERE id = ?").bind(id).first(),
    ).toEqual({ published, version: 3 });
  });

  it("is told when the overlay is deleted, and its own close then completes", async () => {
    const id = await overlay(published);
    const live = connect(id);
    await live.opened;
    await live.next();
    expect((await asOwner("DELETE", `/api/overlays/${id}`)).status).toBe(204);
    expect(JSON.parse(await live.next())).toEqual({ deleted: true });
    // The overlay's client closes on that message (src/lib/live.ts).
    live.ws.close(1000);
    expect(await live.closed).toBe(1000);
  });

  it("works with the overlay's own client: each Update OBS arrives, and it stops for good when the overlay is deleted", async () => {
    const id = await overlay(published);
    /** Node's WebSocket, counting the connections the client opens. */
    const opened: WebSocket[] = [];
    class Counted extends WebSocket {
      constructor(url: string) {
        super(url);
        opened.push(this);
      }
    }
    const got: [string, number][] = [];
    let arrived = () => {};
    const nextArrival = () => new Promise<void>((resolve) => (arrived = resolve));
    const first = nextArrival();
    const stop = followLive(
      id,
      (settings, version) => {
        got.push([settings, version]);
        arrived();
      },
      { origin: base.origin, WebSocketImpl: Counted },
    );
    try {
      await first;
      const second = nextArrival();
      await asOwner("POST", `/api/overlays/${id}/publish`);
      await second;
      expect(got).toEqual([
        [published, 3],
        [draft, 4],
      ]);
      await asOwner("DELETE", `/api/overlays/${id}`);
      // Longer than the first reconnect wait could be: it closed, and never came back.
      await new Promise((r) => setTimeout(r, 1500));
      expect(opened).toHaveLength(1);
      expect(opened[0]!.readyState).toBe(WebSocket.CLOSED);
    } finally {
      stop();
    }
  });

  it("opens no connection for an id that isn't an overlay, and answers a plain request with a 426", async () => {
    for (const id of [newOverlayId(), "not-an-id"]) {
      const res = await harness.fetch(`/api/live/${id}`, { headers: { Upgrade: "websocket" } });
      expect(res.status, id).toBe(404);
    }
    const plain = await fetch(new URL(`/api/live/${await overlay(published)}`, base));
    expect(plain.status).toBe(426);
  });
});
