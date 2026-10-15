import { readFileSync } from "node:fs";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import { fakeTwitch, priv } from "./fake-twitch";

const link = (route: string, extra: object = {}, query = "rm=1") =>
  `/o/${route}?${query}#1.${lz.compressToEncodedURIComponent(JSON.stringify({ theme: "rain-city", ...extra }))}`;
const editor = (extra: object = {}) => link("starting", extra).replace("/o/starting", "/editor");
const saved = (page: Page, hash?: string) =>
  page.evaluate(async (hash) => {
    const path: string = "/src/settings/url.ts";
    const { decode }: typeof import("../../src/settings/url") = await import(path);
    return decode(hash ?? location.hash).settings;
  }, hash);
const layouts = async (page: Page) => (await saved(page)).layouts;

const pngPixels = (page: Page, png: Uint8Array, points: [number, number][]) =>
  page.evaluate(
    async ({ bytes, points }) => {
      const image = await createImageBitmap(
        new Blob([new Uint8Array(bytes)], { type: "image/png" }),
      );
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(image, 0, 0);
      const pixels = points.map(([x, y]) => [...ctx.getImageData(x, y, 1, 1).data]);
      image.close();
      return pixels;
    },
    { bytes: Array.from(png), points },
  );

test.use({ viewport: { width: 1440, height: 1000 } });

for (const [width, height, portrait] of [
  [1920, 1080, false],
  [1280, 720, false],
  [640, 360, false],
  [1080, 1920, true],
  [360, 640, true],
] as const)
  test(`Rain City scenes at ${width}×${height} keep the logo, custom colors and canvas bounds`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    const canvas = portrait ? "portrait" : "landscape";
    const extra = {
      logo: "https://example.invalid/rain-city-logo.svg",
      advanced: { colors: { accent: "#79DEC8", primary: "#FFFFFF" } },
      layouts: { [canvas]: { size: { width, height } } },
      socials: [{ platform: "twitch", handle: "maya_plays" }],
      starting: { endsAt: Date.now() + 600_000, subtitle: "Chill games and good chat", tz: "UTC" },
    };
    await page.route(extra.logo, (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><circle cx="40" cy="40" r="34" fill="white"/></svg>',
      }),
    );
    for (const route of ["starting", "brb", "ending", "offline", "chatting", "reaction"]) {
      await page.goto(link(route, extra, `rm=1${portrait ? "&canvas=vertical" : ""}`));
      await page.evaluate(() => document.fonts.ready);
      const scene = page.locator(".scene");
      if (portrait && route === "starting") {
        // The selected portrait heading is 150 design pixels; a logo must not force it down to the fit's floor.
        const size = await scene
          .locator(".scene-title")
          .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
        expect(size).toBeGreaterThanOrEqual(120);
      }
      const bounds = (await scene.boundingBox())!;
      expect([Math.round(bounds.width), Math.round(bounds.height)]).toEqual([width, height]);
      if (!["chatting", "reaction"].includes(route))
        await expect(page.getByAltText("Channel logo")).toBeVisible();
      await expect(scene.locator(".scene-title-end")).toHaveCSS("color", "rgb(121, 222, 200)");
      await test.info().attach(`${route}-${width}x${height}.png`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    }
  });

test("Rain City is in Calm, customizes both canvases and resets each independently", async ({
  page,
}) => {
  await page.goto("/editor?rm=1");
  await page.getByRole("button", { name: "Rain City", exact: true }).click();
  await page.getByRole("button", { name: "Calm", exact: true }).click();
  await expect(
    page.locator('.editor-strip-look:not([hidden]) [data-theme="rain-city"]'),
  ).toBeAttached();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  const landscape = (await layouts(page)).landscape?.scenes.starting;
  expect(landscape?.length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Vertical", exact: true }).click();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await expect(page.locator(".canvas .safe-zone")).toBeVisible();
  expect((await layouts(page)).portrait?.scenes.starting).not.toEqual(landscape);
  await page.getByRole("button", { name: "Reset to the look", exact: true }).click();
  expect((await layouts(page)).portrait?.scenes.starting).toBeUndefined();
  expect((await layouts(page)).landscape?.scenes.starting).toEqual(landscape);
  await page.getByRole("button", { name: "Horizontal", exact: true }).click();
  await page.getByRole("button", { name: "Customize", exact: true }).click();
  await page.getByRole("button", { name: "Reset to the look", exact: true }).click();
  expect((await layouts(page)).landscape?.scenes.starting).toBeUndefined();
  const scan = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
  expect(scan.violations).toEqual([]);
});

for (const vertical of [false, true]) {
  const query = `rm=1${vertical ? "&canvas=vertical" : ""}`;
  test(`Rain City ${vertical ? "portrait" : "landscape"} camera scenes and Live keep their holes and widgets`, async ({
    page,
  }) => {
    await fakeTwitch(page);
    for (const route of ["chatting", "reaction"]) {
      await page.goto(link(route, { chat: { channel: "dallas" } }, query));
      await expect(page.locator('.scene[data-theme="rain-city"]')).toBeVisible();
      await expect(page.locator('.frame[data-theme="rain-city"]')).toHaveCount(1);
      const mask = await page.locator(".scene").evaluate((el) => getComputedStyle(el).maskImage);
      expect(mask).not.toBe("none");
      await expect(page.locator(".frame-edge")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      if (route === "reaction") await expect(page.locator(".cam-screen")).toHaveCount(1);
    }
    await page.goto(link("live", { chat: { channel: "dallas" } }, query));
    for (const widget of ["chat", "alerts", "frame"])
      await expect(page.locator(`.${widget}[data-theme="rain-city"]`)).toHaveCount(1);
    await expect(page.locator(".live")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
  });

  test(`Rain City ${vertical ? "portrait" : "landscape"} standalone widgets and follow test sample work`, async ({
    page,
  }) => {
    const twitch = await fakeTwitch(page);
    await page.goto(link("chat", { chat: { channel: "dallas", width: 880, height: 500 } }, query));
    await twitch.send(priv("rain-city-chat", "sofie", "The moon looks so good"));
    await expect(page.locator('.chat[data-theme="rain-city"]')).toContainText(
      "The moon looks so good",
    );
    await expect(page.locator(".chat-msg")).toHaveCSS("border-left-color", "rgb(113, 214, 209)");
    await page.goto(
      link("frame", { frame: { width: 880, height: 495, label: "maya_plays" } }, query),
    );
    await expect(page.locator(".frame")).toHaveCSS("width", "880px");
    await expect(page.locator(".frame-label")).toHaveText("maya_plays");
    await expect(page.locator(".frame-edge")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await page.clock.install();
    const sound = page.waitForResponse(/\/sounds\/rain-city[.]ogg$/);
    await page.goto(link("alerts", { alerts: { seconds: 3 } }, `${query}&test=1`));
    await expect(page.locator(".alert-title")).toContainText("FriendlyRaider");
    expect((await sound).ok()).toBe(true);
    await page.clock.runFor(17_600);
    await expect(page.locator('.alert-box[data-kind="follow"]')).toContainText("NewFollower");
    await expect(page.locator(".alert-box")).toHaveCSS("border-left-color", "rgb(113, 214, 209)");
    const crescent = await page
      .locator(".alert-box")
      .evaluate((el) => getComputedStyle(el, "::before").maskImage);
    expect(crescent).toContain("rain-city-sign.svg");
  });
}

test("Rain City's rain moves only in Full, pauses when hidden, and the scene replays on air without resetting the clock", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-10-15T12:00:00Z"));
  const extra = { starting: { endsAt: Date.parse("2026-10-15T12:10:00Z"), tz: "UTC" } };
  await page.goto(link("starting", extra, ""));
  const scene = page.locator(".scene");
  const rain = (prop: "animationName" | "animationPlayState" | "display") =>
    page.locator(".scene-main").evaluate((el, p) => getComputedStyle(el, "::before")[p], prop);
  await expect.poll(() => rain("animationName")).toBe("rain-city-rain");
  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("obsSourceVisibleChanged", { detail: { visible: false } })),
  );
  await expect.poll(() => rain("animationPlayState")).toBe("paused");
  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("obsSourceVisibleChanged", { detail: { visible: true } })),
  );
  await expect.poll(() => rain("animationPlayState")).toBe("running");
  const clock = await page.locator(".countdown-time").textContent();
  await scene.evaluate((el) => el.setAttribute("data-before-replay", ""));
  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("obsSourceActiveChanged", { detail: { active: true } })),
  );
  await expect(scene).not.toHaveAttribute("data-before-replay");
  await expect(page.locator(".countdown-time")).toHaveText(clock ?? "");
  // Lite and Still drop the rain as a whole layer; the sign stays.
  for (const mode of [{ liteMotion: true }, { lessMotion: true }]) {
    await page.goto(link("starting", mode, ""));
    await expect.poll(() => rain("display")).toBe("none");
    expect(await scene.evaluate((el) => getComputedStyle(el, "::before").maskImage)).toContain(
      "rain-city-sign.svg",
    );
  }
  // Portrait keeps rain off: the words are in the sign's column there.
  await page.goto(link("starting", {}, "canvas=vertical"));
  await expect.poll(() => rain("display")).toBe("none");
});

test("Rain City downloads matching panels, banner and saved OBS collection links", async ({
  page,
}) => {
  await page.goto(editor());
  const part = page.locator("#part-channel");
  for (const [name, width, height] of [
    ["Download the Schedule panel", 320, 96],
    ["Download offline banner", 1920, 1080],
  ] as const) {
    const [download] = await Promise.all([
      page.waitForEvent("download"),
      part.getByRole("button", { name }).click(),
    ]);
    const bytes = readFileSync(await download.path());
    await test
      .info()
      .attach(download.suggestedFilename(), { body: bytes, contentType: "image/png" });
    const data = new DataView(bytes.buffer, bytes.byteOffset);
    expect([data.getUint32(16), data.getUint32(20)]).toEqual([width, height]);
    if (width === 1920) {
      // The lune must survive PNG export as a crescent, not the rectangular gradient underneath its mask.
      // Outside the sign, the night; somewhere on the tube's stroke, the tube's cyan.
      const [outside] = await pngPixels(page, bytes, [[1000, 80]]);
      expect(outside!.slice(0, 3)).toEqual([16, 26, 36]);
      const tube = await pngPixels(
        page,
        bytes,
        Array.from({ length: 21 }, (_, i) => [1478 + 64 * 0.867, 110 + (120 + i * 5) * 0.867]),
      );
      expect(Math.max(...tube.map((p) => p[1]!))).toBeGreaterThan(150);
    }
  }
  await expect(part.locator(".channel-panel").first()).toHaveAttribute("data-theme", "rain-city");
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Download OBS scene collection" }).click(),
  ]);
  const file: { sources: { id: string; settings: { url?: string } }[] } = JSON.parse(
    readFileSync(await download.path(), "utf8"),
  );
  const links = file.sources
    .filter((s) => s.id === "browser_source")
    .map((s) => s.settings.url ?? "");
  expect(links).toHaveLength(7);
  for (const url of links) expect((await saved(page, new URL(url).hash)).theme).toBe("rain-city");
});
