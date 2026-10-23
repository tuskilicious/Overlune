import { beforeEach, describe, expect, it } from "vitest";
import { routes as workerRoutes } from "../../functions/router";
import { apiHeaders } from "../../functions/api/_middleware";
import { onRequestGet as health } from "../../functions/api/health";
import { onRequestDelete as deleteMe, onRequestGet as getMe } from "../../functions/api/me";
import { onRequestPost as signout } from "../../functions/api/auth/signout";
import { onRequestPost as signoutEverywhere } from "../../functions/api/auth/signout-everywhere";
import { onRequestGet as start } from "../../functions/api/auth/twitch/index";
import { onRequestGet as callback } from "../../functions/api/auth/twitch/callback";
import {
  onRequestGet as listOverlays,
  onRequestPost as createOverlay,
} from "../../functions/api/overlays";
import {
  onRequestDelete as deleteOverlay,
  onRequestGet as getOverlay,
  onRequestPatch as updateOverlay,
} from "../../functions/api/overlay";
import { onRequestPost as publishOverlay } from "../../functions/api/overlay-publish";
import { onRequestGet as live } from "../../functions/api/live";
import type { Handler } from "../../functions/lib/env";
import { deleteUser } from "../../functions/lib/db";
import { newOverlayId } from "../../functions/lib/overlays";
import { hashToken, newSessionToken } from "../../functions/lib/session";
import { encode } from "../../src/settings/url";
import { defaultSettings } from "../../src/settings/schema";
import { answer, api, env, ORIGIN, rows, signIn, twitch, withFakeTwitch } from "./twitch-fake";

/**
 * Access-control tests (T7.5, CLAUDE.md §4): every API route, attacked the way someone would. Signed out, with a
 * forged, malformed, expired or deleted account's cookie, as user A against user B, from another site, with guessed
 * and malformed addresses, with the wrong method. Every attempt answers 401, 403 or 404 (or, for GET /api/me, which
 * only asks who's signed in, an empty 204), the same way whether or not the target exists, and changes nothing that
 * isn't the caller's own.
 *
 * A new route can't merge without its entry here: the first tests fail for any file in functions/api/ that isn't in
 * `routes`, and for any difference between `routes` and the Worker's own route table (functions/index.ts).
 */

type Access =
  /** Anyone: no account data. */
  | "public"
  /** Only the signed-in user, about themselves. */
  | "self"
  /** Ends the caller's own session; signed out it only clears their own cookie, which touches no data. */
  | "own-session"
  /** Only the signed-in owner of the saved overlay in the path (T12.2). */
  | "owner";

const routes: {
  file: string;
  path: string;
  methods: Partial<Record<"GET" | "POST" | "PATCH" | "DELETE", Handler>>;
  access: Access;
}[] = [
  { file: "health.ts", path: "/api/health", methods: { GET: health }, access: "public" },
  {
    file: "auth/twitch/index.ts",
    path: "/api/auth/twitch",
    methods: { GET: start },
    access: "public",
  },
  {
    file: "auth/twitch/callback.ts",
    path: "/api/auth/twitch/callback",
    methods: { GET: callback },
    access: "public",
  },
  { file: "me.ts", path: "/api/me", methods: { GET: getMe, DELETE: deleteMe }, access: "self" },
  {
    file: "auth/signout.ts",
    path: "/api/auth/signout",
    methods: { POST: signout },
    access: "own-session",
  },
  {
    file: "auth/signout-everywhere.ts",
    path: "/api/auth/signout-everywhere",
    methods: { POST: signoutEverywhere },
    access: "self",
  },
  {
    file: "overlays.ts",
    path: "/api/overlays",
    methods: { GET: listOverlays, POST: createOverlay },
    access: "self",
  },
  {
    file: "overlay.ts",
    path: "/api/overlays/:id",
    methods: { GET: getOverlay, PATCH: updateOverlay, DELETE: deleteOverlay },
    access: "owner",
  },
  {
    file: "overlay-publish.ts",
    path: "/api/overlays/:id/publish",
    methods: { POST: publishOverlay },
    access: "owner",
  },
  // Read-only, by an id only the owner's links carry: what's published, never the draft (live.test.ts).
  { file: "live.ts", path: "/api/live/:id", methods: { GET: live }, access: "public" },
];

/** Every Function file under functions/api/, found at build time, without importing them. */
const files = Object.keys(import.meta.glob("../../functions/api/**/*.ts")).map((f) =>
  f.replace("../../functions/api/", ""),
);

/** Every account row, to prove an attempt changed nothing. */
const snapshot = async () =>
  JSON.stringify([await rows("users"), await rows("sessions"), await rows("overlays")]);

/** Settings in the link's form: what a saved overlay holds. */
const settings = encode(defaultSettings);
/** A path with its `:id` filled in. */
const at = (path: string, id: string) => path.replace(":id", id);

withFakeTwitch();

let a: string;
let b: string;
let bId: string;
/** A saved overlay of A's and one of B's. */
let aOverlay: string;
let bOverlay: string;
beforeEach(async () => {
  await env.DB.prepare("DELETE FROM overlays").run();
  await env.DB.prepare("DELETE FROM sessions").run();
  await env.DB.prepare("DELETE FROM users").run();
  twitch.sub = twitch.helixId = "111";
  a = await signIn();
  twitch.sub = twitch.helixId = "222";
  b = await signIn();
  bId = (await rows("users")).find((u) => u.twitch_id === "222")!.id as string;
  const save = async (token: string, name: string) =>
    (
      (await (await api("POST", "/api/overlays", { token, body: { name, settings } })).json()) as {
        id: string;
      }
    ).id;
  aOverlay = await save(a, "A's starting scene");
  bOverlay = await save(b, "B's starting scene");
});

describe("the route registry", () => {
  it("lists every Function file, so no route ships without these tests", () => {
    const special = ["_middleware.ts", "[[path]].ts"];
    expect(files.filter((f) => !special.includes(f)).sort()).toEqual(
      routes.map((r) => r.file).sort(),
    );
  });

  it("is exactly the Worker's route table: the same paths, methods and handlers (T12.1)", () => {
    expect(Object.fromEntries(routes.map((r) => [r.path, r.methods]))).toEqual(workerRoutes);
  });
});

describe("cookies that aren't a live session", () => {
  /** Cookies that must all count as signed out, and look identical doing it. */
  async function badTokens() {
    twitch.sub = twitch.helixId = "333";
    const gone = await signIn();
    const goneId = (await rows("users")).find((u) => u.twitch_id === "333")!.id as string;
    await deleteUser(env.DB, goneId);
    // After the sign-in above, which clears expired sessions.
    const expired = newSessionToken();
    const aId = (await rows("users")).find((u) => u.twitch_id === "111")!.id as string;
    await env.DB.prepare("INSERT INTO sessions VALUES (?, ?, 1, 2)")
      .bind(await hashToken(expired), aId)
      .run();
    return {
      none: null,
      forged: newSessionToken(),
      malformed: "x'; DROP TABLE users; --",
      tooLong: "A".repeat(5000),
      expired,
      deletedAccount: gone,
    };
  }

  for (const route of routes.filter((r) => r.access === "self" || r.access === "owner"))
    for (const method of Object.keys(route.methods))
      it(`${method} ${route.path}: signed out, the same for every one of them, and nothing changes`, async () => {
        const tokens = await badTokens();
        const before = await snapshot();
        const answers = await Promise.all(
          Object.values(tokens).map(async (token) =>
            answer(
              await api(method, at(route.path, aOverlay), {
                token,
                body: method === "GET" || method === "DELETE" ? undefined : { name: "x", settings },
              }),
            ),
          ),
        );
        for (const res of answers) expect(res).toEqual(answers[0]);
        // "Who am I?" signed out is an empty 204; anything that needs an account is a 401.
        if (method === "GET" && route.path === "/api/me")
          expect(answers[0]).toMatchObject({ status: 204, body: "", cookie: null });
        else expect(answers[0]!.status).toBe(401);
        expect(await snapshot()).toBe(before);
      });

  it("POST /api/auth/signout: removes at most the session of the token it's given, nothing else", async () => {
    const tokens = await badTokens();
    for (const token of Object.values(tokens)) {
      const own = token ? await hashToken(token) : null;
      const before = (await rows("sessions")).filter((s) => s.token_hash !== own);
      const users = await rows("users");
      const res = await api("POST", "/api/auth/signout", { token });
      expect(res.status).toBe(204);
      expect(res.headers.get("Set-Cookie")).toContain("Max-Age=0");
      expect(await rows("sessions")).toEqual(before);
      expect(await rows("users")).toEqual(users);
    }
  });
});

describe("user A against user B", () => {
  it("A's /api/me is only ever A", async () => {
    expect(await (await api("GET", "/api/me", { token: a })).json()).toMatchObject({
      displayName: "MoonStreamer",
    });
    const me = await (await api("GET", "/api/me", { token: a })).text();
    expect(me).not.toContain(bId);
    expect(me).not.toContain("222");
  });

  it("A signing out everywhere ends only A's sessions", async () => {
    expect((await api("POST", "/api/auth/signout-everywhere", { token: a })).status).toBe(204);
    expect((await api("GET", "/api/me", { token: a })).status).toBe(204);
    expect((await api("GET", "/api/me", { token: b })).status).toBe(200);
  });

  it("A deleting their account removes only A, saved overlays included", async () => {
    expect((await api("DELETE", "/api/me", { token: a })).status).toBe(204);
    expect((await rows("users")).map((u) => u.twitch_id)).toEqual(["222"]);
    expect((await rows("sessions")).map((s) => s.token_hash)).toEqual([await hashToken(b)]);
    expect((await rows("overlays")).map((o) => o.id)).toEqual([bOverlay]);
    expect((await api("GET", "/api/me", { token: b })).status).toBe(200);
  });

  it("A's list of saved overlays is only ever A's", async () => {
    const list = await (await api("GET", "/api/overlays", { token: a })).text();
    expect(list).toContain(aOverlay);
    expect(list).not.toContain(bOverlay);
    expect(list).not.toContain(bId);
  });

  it("A can't read, rename, save over, publish or delete B's overlay: the same 404 as an id that doesn't exist, and nothing changes", async () => {
    const before = await snapshot();
    const tries: [string, string, unknown][] = [
      ["GET", "/api/overlays/:id", undefined],
      ["PATCH", "/api/overlays/:id", { name: "mine now" }],
      ["PATCH", "/api/overlays/:id", { settings }],
      ["POST", "/api/overlays/:id/publish", undefined],
      ["DELETE", "/api/overlays/:id", undefined],
    ];
    for (const [method, path, body] of tries) {
      const theirs = await answer(await api(method, at(path, bOverlay), { token: a, body }));
      const madeUp = await answer(await api(method, at(path, newOverlayId()), { token: a, body }));
      expect(theirs, `${method} ${path}`).toEqual(madeUp);
      expect(theirs).toMatchObject({ status: 404, body: '{"error":"not found"}' });
    }
    expect(await snapshot()).toBe(before);
  });

  it("guessing ids finds nothing: well-formed, malformed, B's account id, or tricks in the path", async () => {
    const before = await snapshot();
    const notFound = await answer(
      await api("GET", at("/api/overlays/:id", newOverlayId()), { token: a }),
    );
    for (const id of [
      newOverlayId(),
      bOverlay.toLowerCase(),
      `${bOverlay}x`,
      bOverlay.slice(1),
      bId,
      "1",
      "%2e%2e",
      encodeURIComponent(`${bOverlay}' OR '1'='1`),
      `${bOverlay}%00`,
      "a".repeat(3000),
    ])
      for (const path of ["/api/overlays/:id", "/api/overlays/:id/publish"])
        for (const method of path.endsWith("publish") ? ["POST"] : ["GET", "DELETE"])
          expect(
            await answer(await api(method, at(path, id), { token: a })),
            `${method} ${at(path, id).slice(0, 80)}`,
          ).toEqual(notFound);
    expect(await snapshot()).toBe(before);
  });
});

describe("guessed and malformed addresses", () => {
  it("are all the same plain 404, whether or not the id is real, signed in or not", async () => {
    const fakeId = crypto.randomUUID();
    const paths = [
      `/api/me/${bId}`,
      `/api/me/${fakeId}`,
      `/api/users/${bId}`,
      `/api/users/${fakeId}`,
      `/api/users`,
      `/api/sessions`,
      `/api/me/sessions`,
      `/api/%2e%2e/me`,
      `/api/me%00`,
      `/api/${"a".repeat(3000)}`,
      `/api/me?id=${bId}`.replace("/api/me", "/api/user"),
    ];
    const answers = [];
    for (const path of paths)
      for (const token of [null, a])
        for (const method of ["GET", "POST", "DELETE"])
          answers.push(await answer(await api(method, path, { token })));
    for (const res of answers) expect(res).toEqual(answers[0]);
    expect(answers[0]).toMatchObject({ status: 404, body: '{"error":"not found"}' });
  });

  it("an existing route with the wrong method is that same 404", async () => {
    const notFound = await answer(await api("GET", "/api/nope"));
    const wrong = [
      ["POST", "/api/me"],
      ["PUT", "/api/me"],
      ["GET", "/api/auth/signout"],
      ["GET", "/api/auth/signout-everywhere"],
      ["DELETE", "/api/health"],
      ["POST", "/api/auth/twitch"],
      ["PUT", "/api/overlays"],
      ["DELETE", "/api/overlays"],
      ["PATCH", "/api/overlays"],
      ["POST", `/api/overlays/${aOverlay}`],
      ["PUT", `/api/overlays/${aOverlay}`],
      ["GET", `/api/overlays/${aOverlay}/publish`],
      ["DELETE", `/api/overlays/${aOverlay}/publish`],
    ];
    for (const [method, path] of wrong)
      expect(await answer(await api(method!, path!, { token: a }))).toEqual(notFound);
  });
});

describe("other sites", () => {
  for (const [method, path] of [
    ["DELETE", "/api/me"],
    ["POST", "/api/auth/signout"],
    ["POST", "/api/auth/signout-everywhere"],
    ["POST", "/api/overlays"],
    ["PATCH", "/api/overlays/:id"],
    ["DELETE", "/api/overlays/:id"],
    ["POST", "/api/overlays/:id/publish"],
  ] as const)
    it(`can't ${method} ${path} with a signed-in cookie: a 403, and nothing changes`, async () => {
      const before = await snapshot();
      const body = method === "POST" || method === "PATCH" ? { name: "x", settings } : undefined;
      for (const origin of [null, "https://evil.example", "null", `${ORIGIN}.evil.example`])
        expect((await api(method, at(path, aOverlay), { token: a, origin, body })).status).toBe(
          403,
        );
      expect(await snapshot()).toBe(before);
    });
});

describe("every answer", () => {
  it("carries the API's security headers, error or not", async () => {
    for (const [method, path, token] of [
      ["GET", "/api/health", null],
      ["GET", "/api/me", a],
      ["GET", "/api/me", null],
      ["GET", "/api/nope", null],
      ["DELETE", "/api/me", "x"],
      ["GET", "/api/overlays", a],
      ["GET", "/api/overlays/x", a],
      ["GET", "/api/live/x", null],
    ] as const) {
      const res = await api(method, path, { token, origin: null });
      for (const [name, value] of Object.entries(apiHeaders))
        expect(res.headers.get(name), `${method} ${path} ${name}`).toBe(value);
    }
  });
});
