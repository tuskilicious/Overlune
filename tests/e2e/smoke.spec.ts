import { expect, test } from "@playwright/test";
import lz from "lz-string";
import { themeIds } from "../../src/themes/types";
import chattingLink from "../fixtures/links/v1/chatting.json" with { type: "json" };
import offlineLink from "../fixtures/links/v1/offline.json" with { type: "json" };

const link = (data: unknown) =>
  `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`;

test("starting soon overlay renders", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("socials with no name are left off the scene (T6.27)", async ({ page }) => {
  await page.goto(
    link({
      socials: [
        { platform: "twitch", handle: "" },
        { platform: "youtube", handle: "   " },
        { platform: "x", handle: "somestreamer" },
      ],
    }),
  );
  await expect(page.locator(".scene-socials li")).toHaveText(["X somestreamer"]);
  await page.goto(link({ socials: [{ platform: "twitch", handle: "" }] }));
  await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  await expect(page.locator(".scene-socials")).toHaveCount(0);
});

test("socials show as platform icons, with the platform word kept (T6.35)", async ({ page }) => {
  const socials = [{ platform: "twitch", handle: "tusk" }];
  await page.goto(link({ socials }));
  await expect(page.locator(".scene-socials .scene-icon")).toBeVisible();
  await expect(page.locator(".scene-socials .scene-platform")).toHaveText("Twitch"); // kept for screen readers
});

test("a valid link shows no error card", async ({ page }) => {
  await page.goto(link({ starting: { title: "Back in a bit" } }));
  await expect(page.getByRole("heading", { name: "Back in a bit" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

for (const hash of ["#1.garbage", "#9.abc"]) {
  test(`a damaged link (${hash}) shows the error card over the defaults`, async ({ page }) => {
    await page.goto(`/o/starting${hash}`);
    await expect(page.getByRole("status")).toContainText("This overlay link has a problem");
    await expect(page.getByRole("status")).toContainText("Some settings couldn’t be read");
    await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  });
}

const entranceAnimation = (page: import("@playwright/test").Page) =>
  page
    .locator(".scene-word")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);

test("the entrance animates by default, word by word (T6.117)", async ({ page }) => {
  await page.goto("/o/starting");
  expect(await entranceAnimation(page)).toBe("scene-slide-fade");
  // Each word waits its turn.
  const delays = await page
    .locator(".scene-word")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDelay));
  expect(delays).toEqual(["0.16s", "0.25s"]);
});

test("only the countdown digits that change flip in (T6.117)", async ({ page }) => {
  // Paused, so time only moves when the test says so.
  await page.clock.install({ time: new Date("2026-10-02T11:59:00Z") });
  await page.clock.pauseAt(new Date("2026-10-02T12:00:00Z"));
  const data = { starting: { endsAt: new Date("2026-10-02T12:10:05Z").getTime() } };
  await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
  await expect(page.locator(".countdown-time")).toHaveText("10:05");
  const first = await page.locator(".countdown-ch").elementHandles();
  await page.clock.runFor(1000);
  await expect(page.locator(".countdown-time")).toHaveText("10:04");
  const after = await page.locator(".countdown-ch").elementHandles();
  // "1", "0", ":" and "0" are the same elements; only the last digit was replaced.
  const same = await Promise.all(after.map((h, i) => h.evaluate((a, b) => a === b, first[i])));
  expect(same).toEqual([true, true, true, true, false]);
});

test("?rm=1 turns animations off", async ({ page }) => {
  await page.goto("/o/starting?rm=1");
  expect(await entranceAnimation(page)).toBe("none");
});

test("the OS reduced-motion setting turns animations off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/o/starting");
  expect(await entranceAnimation(page)).toBe("none");
});

test("one bad field shows the error card but keeps the rest", async ({ page }) => {
  await page.goto(link({ logo: "javascript:alert(1)", starting: { title: "Back in a bit" } }));
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Back in a bit" })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});

for (const [route, heading] of [
  ["brb", "Be right back"],
  ["ending", "Thanks for watching!"],
] as const) {
  test(`${route} overlay renders its default title`, async ({ page }) => {
    await page.goto(`/o/${route}`);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test(`${route} overlay shows the error card for a damaged link`, async ({ page }) => {
    await page.goto(`/o/${route}#1.garbage`);
    await expect(page.getByRole("status")).toContainText("This overlay link has a problem");
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}

// T6.68: each page has its own tab title and canonical address on overlune.in; overlays have no canonical.
for (const [path, title] of [
  ["/", "Overlune: free stream overlays for OBS"],
  ["/editor", "Make your overlays · Overlune"],
  ["/guide", "Set up your overlays in OBS · Overlune"],
  ["/privacy", "Privacy · Overlune"],
  ["/nope", "Page not found · Overlune"],
] as const) {
  test(`${path} has its own title and canonical address`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://overlune.in${path}`,
    );
  });
}

test("overlays have no canonical address", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.locator(".scene")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});

test("the bolder pass: a light runs round the countdown, and Lite holds it (T6.123)", async ({
  page,
}) => {
  const data = { theme: "daylight", starting: { endsAt: Date.now() + 3_600_000 } };
  const link = (extra = {}) =>
    `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify({ ...data, ...extra }))}`;
  const sweep = () =>
    // The light is the spinning layer inside .countdown-edge since T6.144.
    page
      .locator(".countdown-edge")
      .evaluate((el) => getComputedStyle(el, "::before").animationName);
  const disc = () =>
    page.locator(".scene").evaluate((el) => getComputedStyle(el, "::before").animationName);
  await page.goto(link());
  expect(await sweep()).toBe("countdown-sweep");
  expect(await disc()).toBe("daylight-breathe");
  await page.goto(link({ liteMotion: true }));
  expect(await sweep()).toBe("none");
  expect(await disc()).toBe("none");
  // Entrances still blur into focus in Lite.
  await expect(page.locator(".scene-word").first()).toHaveCSS("animation-name", "scene-slide-fade");
});

// Outside UI kits like 21st.dev are for the editor and landing page only (T6.136), and overlay motion is CSS, canvas
// or GSAP through src/lib/motion.ts (T6.137, checked in landing.spec.ts). The dev server serves each package from
// /node_modules/, so no overlay may request another animation or headless-UI package.
test("no overlay loads an animation or UI-kit package (T6.136)", async ({ page }) => {
  for (const overlay of ["starting", "brb", "ending", "chat", "alerts", "frame"]) {
    const packages: string[] = [];
    page.on("request", (r) => {
      if (r.url().includes("/node_modules/")) packages.push(r.url());
    });
    await page.goto(`/o/${overlay}`);
    await page.waitForLoadState("networkidle");
    // The check only means something if packages show up here at all (React always does).
    expect(
      packages.some((url) => /react/.test(url)),
      overlay,
    ).toBe(true);
    expect(
      packages.filter((url) => /framer-motion|[/_]motion|base-ui|radix-ui/i.test(url)),
      overlay,
    ).toEqual([]);
    page.removeAllListeners("request");
  }
});

test.describe("cheap effects (T6.144)", () => {
  const scene = (theme: string) =>
    `/o/starting#1.${lz.compressToEncodedURIComponent(
      JSON.stringify({
        theme,
        starting: { subtitle: "Chill games", endsAt: Date.now() + 26 * 3_600_000, tz: "UTC" },
        socials: [{ platform: "twitch", handle: "yourname" }],
        ticker: { show: true, label: "Follow" },
      }),
    )}`;

  // Looping animations run for the whole stream, so they may only move, turn, scale or fade: the GPU does those
  // without repainting. One allowed exception: Vaporwave's sun stripes slide a mask (the look's signature motion;
  // Lite holds it).
  const cheap = new Set(["transform", "translate", "rotate", "scale", "opacity"]);
  const allowed = new Set(["sun-stripes"]);

  for (const theme of themeIds)
    test(`${theme}: every looping animation moves, turns, scales or fades`, async ({ page }) => {
      await page.goto(scene(theme));
      await page.waitForTimeout(500);
      const loops = await page.evaluate(() =>
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations === Infinity)
          .map((a) => ({
            name: (a as CSSAnimation).animationName,
            props: [
              ...new Set(
                (a.effect as KeyframeEffect)
                  .getKeyframes()
                  .flatMap((k) =>
                    Object.keys(k).filter(
                      (p) => !["offset", "easing", "composite", "computedOffset"].includes(p),
                    ),
                  ),
              ),
            ],
          })),
      );
      const costly = loops
        .filter((l) => !allowed.has(l.name))
        .filter((l) => l.props.length === 0 || l.props.some((p) => !cheap.has(p)))
        .map((l) => `${l.name}: ${l.props.join(", ") || "a custom property"}`);
      expect(costly).toEqual([]);
    });

  test("animations pause while OBS hides the source, and pick up when it's shown", async ({
    page,
  }) => {
    await page.goto(scene("neon-grid"));
    await page.waitForTimeout(500);
    const states = () =>
      page.evaluate(() => [...new Set(document.getAnimations().map((a) => a.playState))]);
    const obs = (visible: boolean) =>
      page.evaluate(
        (v) =>
          dispatchEvent(new CustomEvent("obsSourceVisibleChanged", { detail: { visible: v } })),
        visible,
      );
    await obs(false);
    await expect.poll(states).toEqual(["paused"]);
    await obs(true);
    await expect.poll(states).toContain("running");
  });
});

test.describe("Just Chatting and Offline scenes (T6.147)", () => {
  test("Just Chatting is the look's backdrop with a tag card in the corner, from its saved link", async ({
    page,
  }) => {
    await page.goto(chattingLink.link);
    const tag = page.locator(".scene-tag");
    await expect(tag.getByRole("heading", { level: 1 })).toHaveText("Q&A night");
    await expect(tag).toContainText("Ask me anything in chat");
    await expect(tag).toContainText("tuskilicious");
    // No headline layout: the rest of the screen stays clear for the camera and chat.
    await expect(page.locator(".scene-main")).toHaveCount(0);
    const box = (await tag.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(64);
    expect(box.y).toBeGreaterThanOrEqual(64);
    expect(box.width).toBeLessThanOrEqual(760);
  });

  test("Offline is a full scene in the look's layout, from its saved link", async ({ page }) => {
    await page.goto(offlineLink.link);
    await expect(page.locator(".scene-title")).toHaveText("See you Friday");
    await expect(page.locator(".scene-subtitle")).toHaveText(
      "Streams Mon, Wed and Fri at 8 PM IST",
    );
    await expect(page.locator(".scene")).toHaveAttribute("data-theme", "quest");
  });

  test("both have defaults for links made before they existed", async ({ page }) => {
    await page.goto("/o/chatting#1.N4IgLgFgpgtlIC4QDsoHtkFoDmAnAlgCYgC+QA");
    await expect(page.locator(".scene-tag h1")).toHaveText("Just chatting");
    await page.goto("/o/offline#1.N4IgLgFgpgtlIC4QDsoHtkFoDmAnAlgCYgC+QA");
    await expect(page.locator(".scene-title")).toHaveText("Offline right now");
  });
});
