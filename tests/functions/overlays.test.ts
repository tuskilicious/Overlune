import { beforeEach, describe, expect, it } from "vitest";
import { compressToEncodedURIComponent } from "lz-string";
import { MAX_SETTINGS_CHARS, OVERLAY_LIMIT } from "../../functions/lib/overlays";
import { defaultSettings } from "../../src/settings/schema";
import { encode } from "../../src/settings/url";
import { api, env, rows, signIn, twitch, withFakeTwitch } from "./twitch-fake";

// Saved overlays (T12.2): what the API keeps, what it refuses, and the limit. Who may touch whose overlay is in
// access.test.ts.

withFakeTwitch();

/** Settings in the link's form, as the editor sends them. */
const settings = encode(defaultSettings);
const other = encode({ ...defaultSettings, theme: "rain-city" });
/** Any JSON at all in the link's form, to send what the editor never would. */
const raw = (data: unknown) => `1.${compressToEncodedURIComponent(JSON.stringify(data))}`;

let token: string;
beforeEach(async () => {
  await env.DB.prepare("DELETE FROM overlays").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  twitch.sub = twitch.helixId = "111";
  token = await signIn();
});

const create = (body: unknown, as = token) => api("POST", "/api/overlays", { token: as, body });
const json = async (res: Response) => (await res.json()) as Record<string, unknown>;

describe("saving, opening and updating OBS", () => {
  it("keeps a draft, and only shows it to OBS when the streamer publishes", async () => {
    const res = await create({ name: "  Main setup  ", settings });
    expect(res.status).toBe(201);
    const saved = await json(res);
    expect(saved).toEqual({
      id: expect.stringMatching(/^[A-Za-z0-9_-]{22}$/),
      name: "Main setup",
      updatedAt: expect.any(Number),
      publishedAt: null,
      version: 0,
    });
    const path = `/api/overlays/${saved.id}`;
    expect(await json(await api("GET", path, { token }))).toMatchObject({
      draft: settings,
      published: null,
      version: 0,
    });

    // Editing the draft changes nothing OBS sees until "Update OBS".
    await api("PATCH", path, { token, body: { settings: other } });
    expect(await json(await api("GET", path, { token }))).toMatchObject({
      draft: other,
      published: null,
    });
    const first = await json(await api("POST", `${path}/publish`, { token }));
    expect(first).toMatchObject({ version: 1, publishedAt: expect.any(Number) });
    await api("PATCH", path, { token, body: { settings } });
    expect(await json(await api("GET", path, { token }))).toMatchObject({
      draft: settings,
      published: other,
      version: 1,
    });
    expect(await json(await api("POST", `${path}/publish`, { token }))).toMatchObject({
      version: 2,
    });
    expect(await json(await api("GET", path, { token }))).toMatchObject({ published: settings });
  });

  it("renames without touching the settings, and lists without them", async () => {
    const { id } = await json(await create({ name: "Old name", settings }));
    const res = await api("PATCH", `/api/overlays/${id}`, { token, body: { name: "New name" } });
    expect(await json(res)).toMatchObject({ id, name: "New name" });
    expect(await json(await api("GET", `/api/overlays/${id}`, { token }))).toMatchObject({
      name: "New name",
      draft: settings,
    });
    const list = await json(await api("GET", "/api/overlays", { token }));
    expect(list).toEqual({
      overlays: [
        { id, name: "New name", updatedAt: expect.any(Number), publishedAt: null, version: 0 },
      ],
      limit: OVERLAY_LIMIT,
    });
  });

  it("deletes, and the overlay is gone", async () => {
    const { id } = await json(await create({ name: "Gone soon", settings }));
    expect((await api("DELETE", `/api/overlays/${id}`, { token })).status).toBe(204);
    expect((await api("GET", `/api/overlays/${id}`, { token })).status).toBe(404);
    expect(await rows("overlays")).toEqual([]);
  });
});

describe("what it refuses", () => {
  const refused = async (body: unknown, status = 400) => {
    const res = await create(body);
    expect(res.status, JSON.stringify(body).slice(0, 120)).toBe(status);
    expect(await rows("overlays")).toEqual([]);
  };

  it("settings that aren't exactly valid ones in the link's form", async () => {
    for (const bad of [
      "",
      "not settings",
      "2." + settings.slice(2),
      settings.slice(0, -10),
      "1.!!!",
      raw("just a string"),
      raw({ ...defaultSettings, theme: "no-such-look" }),
      // Fields the schema doesn't have, or would cut, are refused, not quietly kept.
      raw({ ...defaultSettings, owner_id: "someone-else" }),
      raw({ ...defaultSettings, starting: { ...defaultSettings.starting, title: "x".repeat(61) } }),
      raw({ ...defaultSettings, logo: "javascript:alert(1)" }),
      raw({ ...defaultSettings, ["__proto__"]: { polluted: true } }),
    ])
      await refused({ name: "Overlay", settings: bad });
  });

  it("settings past the size limit", async () => {
    await refused({ name: "Overlay", settings: "1." + "A".repeat(MAX_SETTINGS_CHARS) });
  });

  it("names that are empty, too long or hold control characters", async () => {
    for (const name of ["", "   ", "x".repeat(41), "tab\there", "bell\u0007", 42, null])
      await refused({ name, settings });
    // Emoji count as one character each.
    expect((await create({ name: "🌙".repeat(40), settings })).status).toBe(201);
  });

  it("any field besides the name and settings (no mass assignment)", async () => {
    for (const extra of [
      { id: "x".repeat(22) },
      { owner_id: "x" },
      { version: 99 },
      { published: settings },
    ])
      await refused({ name: "Overlay", settings, ...extra });
    const { id } = await json(await create({ name: "Overlay", settings }));
    for (const body of [{}, { version: 9 }, { published: other }, { name: "x", owner_id: "y" }])
      expect((await api("PATCH", `/api/overlays/${id}`, { token, body })).status).toBe(400);
    expect(await json(await api("GET", `/api/overlays/${id}`, { token }))).toMatchObject({
      version: 0,
      published: null,
    });
  });

  it("bodies that aren't JSON, or are too big even without saying so", async () => {
    await refused("{ not json");
    await refused(JSON.stringify({ name: "Overlay", settings, pad: "x".repeat(60 * 1024) }), 413);
  });
});

describe(`the limit of ${OVERLAY_LIMIT}`, () => {
  it("refuses the next one in plain words, per account, until one is deleted", async () => {
    const ids = [];
    for (let i = 0; i < OVERLAY_LIMIT; i++)
      ids.push((await json(await create({ name: `Overlay ${i}`, settings }))).id);
    const over = await create({ name: "One too many", settings });
    expect(over.status).toBe(409);
    expect(await json(over)).toEqual({
      error: "limit",
      message: `You can save up to ${OVERLAY_LIMIT} overlays. Delete one to save a new one.`,
    });
    expect(await rows("overlays")).toHaveLength(OVERLAY_LIMIT);

    // Someone else's account has its own.
    twitch.sub = twitch.helixId = "222";
    const other = await signIn();
    expect((await create({ name: "Theirs", settings }, other)).status).toBe(201);

    await api("DELETE", `/api/overlays/${ids[0]}`, { token });
    expect((await create({ name: "Room again", settings })).status).toBe(201);
  });
});

describe("while saved overlays are closed", () => {
  it("every route is a plain 404, signed in or not, and nothing is saved", async () => {
    const { id } = await json(await create({ name: "Overlay", settings }));
    const before = await rows("overlays");
    for (const open of [
      { ACCOUNTS_OPEN: "true", SAVED_OVERLAYS_OPEN: "false" },
      { ACCOUNTS_OPEN: "true" },
      { ACCOUNTS_OPEN: "false", SAVED_OVERLAYS_OPEN: "true" },
    ])
      for (const [method, path, body] of [
        ["GET", "/api/overlays", undefined],
        ["POST", "/api/overlays", { name: "x", settings }],
        ["GET", `/api/overlays/${id}`, undefined],
        ["PATCH", `/api/overlays/${id}`, { name: "x" }],
        ["DELETE", `/api/overlays/${id}`, undefined],
        ["POST", `/api/overlays/${id}/publish`, undefined],
      ] as const) {
        const res = await api(method, path, { token, body, open });
        expect(res.status, `${method} ${path} ${JSON.stringify(open)}`).toBe(404);
        expect(await res.text()).toBe('{"error":"not found"}');
      }
    expect(await rows("overlays")).toEqual(before);
  });
});

describe("the nightly backup", () => {
  it("can copy every table: each keeps its rowid and holds only text and numbers (BACKUPS.md, dump.mjs)", async () => {
    const tables = (
      await env.DB.prepare(
        "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite!_%' ESCAPE '!' AND name NOT LIKE '!_cf!_%' ESCAPE '!'",
      ).all<{ name: string; sql: string }>()
    ).results;
    expect(tables.map((t) => t.name)).toContain("overlays");
    for (const { name, sql } of tables) {
      expect(sql, name).not.toMatch(/WITHOUT\s+ROWID/i);
      const columns = (await env.DB.prepare(`PRAGMA table_info(${name})`).all<{ type: string }>())
        .results;
      for (const { type } of columns)
        expect(["TEXT", "INTEGER", "REAL"], `${name}: ${type}`).toContain(type.toUpperCase());
    }
  });
});
