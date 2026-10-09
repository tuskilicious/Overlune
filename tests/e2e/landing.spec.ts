import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { themeIds } from "../../src/themes/types";
import lz from "lz-string";
import { build } from "vite";

// T6.34: "/" is the landing page for first-time visitors; the editor lives at /editor.

const scan = (page: import("@playwright/test").Page) =>
  new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();

test("a first visit lands on the marketing page, which leads to the editor", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Free stream overlays that look pro.",
  );
  expect((await scan(page)).violations).toEqual([]);
  await page.getByRole("link", { name: "Make your overlays" }).first().click();
  await expect(page).toHaveURL(/\/editor$/);
  await expect(page.getByRole("region", { name: "Pick a look to start" })).toBeVisible();
});

test("an old editor bookmark (/#1.…) opens the editor with its settings", async ({ page }) => {
  const hash = `#1.${lz.compressToEncodedURIComponent(JSON.stringify({ starting: { title: "From an old bookmark" } }))}`;
  await page.goto(`/${hash}`);
  await expect(page).toHaveURL(new RegExp(`/editor#1\\.`));
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("From an old bookmark");
});

test("returning visitors land on the landing page and can continue their overlay (T6.67)", async ({
  page,
}) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Neon Grid", exact: true }).click();
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Free stream overlays that look pro.",
  );
  await page.getByRole("link", { name: "Continue your overlay" }).click();
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByRole("radio", { name: "Neon Grid" })).toBeChecked();
});

test("the editor's logo leads back to the landing page (T6.67)", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Cozy Café", exact: true }).click();
  await page.getByRole("link", { name: "Overlune home" }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Free stream overlays that look pro.",
  );
});

/** GSAP budgets (T6.137), measured 2026-10-08: core 26.8 KB and ScrollTrigger 17.2 KB, gzipped, with their license notices. */
const gsapBudgetKb = { core: 30, plugin: 20 };

/** Gzipped size, with the web's CompressionStream (Node has it too). */
const gzipKb = async (code: string) =>
  (
    await new Response(
      new Blob([code]).stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer()
  ).byteLength / 1024;

type Chunk = {
  type: "chunk";
  fileName: string;
  code: string;
  imports: string[];
  isEntry: boolean;
  isDynamicEntry: boolean;
  facadeModuleId: string | null;
  moduleIds: string[];
};

test("GSAP never reaches the editor's or the overlays' bundles, arrives only by dynamic import, and stays in budget (T6.137)", async () => {
  test.setTimeout(240_000);
  // The real production chunks, built in memory (the dev server serves unbundled modules).
  const out = (await build({ logLevel: "silent", build: { write: false } })) as {
    output: (Chunk | { type: "asset" })[];
  };
  const chunks = out.output.filter((c): c is Chunk => c.type === "chunk");
  const byFile = new Map(chunks.map((c) => [c.fileName, c]));
  const hasGsap = (c: Chunk) => c.moduleIds.some((m) => m.includes("/node_modules/gsap/"));
  /** A chunk and everything it imports statically: what loads with it, before any dynamic import. */
  const loadsWith = (c: Chunk, seen = new Set<string>()): Set<string> => {
    if (!seen.has(c.fileName)) {
      seen.add(c.fileName);
      for (const f of c.imports) loadsWith(byFile.get(f)!, seen);
    }
    return seen;
  };
  const gsapIn = (c: Chunk) => [...loadsWith(c)].filter((f) => hasGsap(byFile.get(f)!));

  // (a) The main entry (which holds the overlays) and the editor's chunk load no GSAP.
  const entry = chunks.find((c) => c.isEntry)!;
  const editor = chunks.find((c) => c.facadeModuleId?.endsWith("src/editor/EditorPage.tsx"))!;
  expect(gsapIn(entry)).toEqual([]);
  expect(gsapIn(editor)).toEqual([]);

  // (b) No page loads GSAP with it: it only arrives through a dynamic import (src/lib/motion.ts).
  const gsapChunks = chunks.filter(hasGsap);
  expect(gsapChunks.length).toBeGreaterThan(0);
  for (const page of chunks.filter((c) => c.isDynamicEntry && !hasGsap(c)))
    expect(gsapIn(page), page.fileName).toEqual([]);

  // (c) Each GSAP chunk stays in its budget, and keeps GSAP's license notice (its license says not to remove it).
  for (const c of gsapChunks) {
    expect(c.code, c.fileName).toContain("gsap.com/standard-license");
    const kb = await gzipKb(c.code);
    const core = c.facadeModuleId?.endsWith("node_modules/gsap/index.js");
    expect(kb, c.fileName).toBeLessThanOrEqual(core ? gsapBudgetKb.core : gsapBudgetKb.plugin);
  }
});

test("with reduced motion the page is still and fully visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const gsap: string[] = [];
  page.on("request", (r) => /gsap/.test(r.url()) && gsap.push(r.url()));
  await page.goto("/");
  await page.getByRole("heading", { name: "Live in three steps" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Live in three steps" })).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator(".landing-marquee")).toHaveCSS("animation-name", "none");
  // Motion is off, so GSAP isn't even downloaded (T6.137).
  expect(gsap).toEqual([]);
});

test("at phone width the page has no sideways scroll and stays accessible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBe(0);
  expect((await scan(page)).violations).toEqual([]);
});

// T6.44: the page clips sideways overflow, so the check above can't see a scene drawn at its full 1920px.
for (const width of [390, 768, 1023]) {
  test(`at ${width}px every look in the gallery fits its column`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const looks = page.locator("[data-look]");
    await expect(looks).toHaveCount(themeIds.length);
    for (const box of await looks.evaluateAll((els) =>
      els.map((el) => el.getBoundingClientRect()),
    )) {
      expect(box.right).toBeLessThanOrEqual(width);
      expect(box.height).toBeLessThan(width); // a 16:9 scene, not a 1080px tall one
    }
  });
}

// T6.45: the hero scene's title sits at the bottom of its frame; it must stay above the fold and the name strip.
for (const [width, height] of [
  [1366, 768],
  [1920, 1080],
] as const) {
  test(`at ${width}×${height} the hero scene's title is in view and clear of the theme names`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const title = (await page.locator("figure .scene-title").boundingBox())!;
    const strip = (await page.getByLabel("Themes").boundingBox())!;
    expect(title.y + title.height).toBeLessThanOrEqual(height);
    expect(title.y + title.height).toBeLessThanOrEqual(strip.y);
  });
}

test("the stream stage shows the whole kit in one look, and switching the look restyles all of it (T6.124)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const stage = page.locator(".landing-stage");
  await stage.scrollIntoViewIfNeeded(); // previews are built when they come near the screen (T6.78)
  for (const part of [".chat", ".alert-box", ".frame"])
    await expect(stage.locator(part)).toHaveCount(1);
  const themesShown = () =>
    stage
      .locator("[data-theme]")
      .evaluateAll((els) => [...new Set(els.map((el) => el.getAttribute("data-theme")))]);
  expect(await themesShown()).toEqual(["abyss"]);
  await page.getByRole("button", { name: "Shonen", exact: true }).click();
  await expect(page.getByRole("button", { name: "Shonen", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect.poll(themesShown).toEqual(["shonen"]);
  // Held still for reduced motion: the alert stays on screen, whole.
  await expect(stage.locator(".alert-box")).toBeVisible();
});

test("the cropped alert pictures fit their cards, with no empty space under them (T6.85)", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  // The hero's two alerts and the Alerts card's one, each cropped to its card's height (T6.59). The crop was
  // lost when previews started building after load (T6.78): it measured before the card existed.
  const crops = page.locator("div.landing-alert.overflow-hidden");
  await expect(crops).toHaveCount(3);
  await crops.last().scrollIntoViewIfNeeded();
  await expect(crops.locator(".alert-box")).toHaveCount(3);
  const gaps = () =>
    crops.evaluateAll((els) =>
      els.map((el) => {
        const crop = el.getBoundingClientRect();
        const box = el.querySelector(".alert-box")!.getBoundingClientRect();
        return Math.round(crop.bottom - box.bottom) || 0; // no -0
      }),
    );
  await expect.poll(gaps).toEqual([0, 0, 0]);
});

// No sideways scrolling anywhere on the page (owner, 2026-10-07): the overlay cards always fit, and their text has
// room, from phones to wide windows.
for (const width of [390, 768, 1024, 1280, 1440]) {
  test(`at ${width}px the overlay cards fit without scrolling, and their text has room`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const cards = page.locator(".landing-cards > li");
    await expect(cards).toHaveCount(7);
    for (const box of await cards.evaluateAll((els) => els.map((el) => el.getBoundingClientRect())))
      expect(box.right).toBeLessThanOrEqual(width);
    const scrollers = await page.evaluate(
      () =>
        [...document.querySelectorAll(".landing-cards, .landing-cards *")].filter(
          (el) =>
            el.scrollWidth > el.clientWidth + 1 &&
            /auto|scroll/.test(getComputedStyle(el).overflowX),
        ).length,
    );
    expect(scrollers).toBe(0);
    for (const w of await page
      .locator(".landing-stage-notes > li, .landing-cards h3")
      .evaluateAll((els) => els.map((el) => el.getBoundingClientRect().width)))
      expect(w).toBeGreaterThanOrEqual(200);
  });
}

// T6.59: the hero shows the whole kit, touring the looks; it can be paused, and reduced motion starts it paused.
test("the hero kit tours the looks and scenes, and Pause stops it", async ({ page }) => {
  await page.clock.install();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const kit = page.locator("figure[data-kit]");
  await expect(kit.locator(".scene")).toHaveCount(1);
  await expect(kit.getByText("LIVE", { exact: true })).toBeVisible();
  await expect(kit.locator(".alert-box")).toHaveCount(2);
  const tags = kit.getByRole("list", { name: "Scenes in every look" }).getByRole("listitem");
  await expect(tags).toHaveText(["Starting Soon", "Be Right Back", "Stream Ending", "Offline"]);
  await expect(tags.first()).toHaveAttribute("aria-current", "true");
  await expect(kit).toHaveAttribute("data-kit", "vaporwave-sunset");

  await page.clock.runFor(4600);
  await expect(kit).toHaveAttribute("data-kit", "cozy-cafe");
  await expect(tags.nth(1)).toHaveAttribute("aria-current", "true");

  await page.getByRole("button", { name: "Pause the looks" }).click();
  await page.clock.runFor(10_000);
  await expect(kit).toHaveAttribute("data-kit", "cozy-cafe");
  await expect(page.getByRole("button", { name: "Play the looks" })).toBeVisible();
});

test("with reduced motion the hero kit starts paused on one look", async ({ page }) => {
  await page.clock.install();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const kit = page.locator("figure[data-kit]");
  await expect(page.getByRole("button", { name: "Play the looks" })).toBeVisible();
  await page.clock.runFor(10_000);
  await expect(kit).toHaveAttribute("data-kit", "vaporwave-sunset");
});

test("the hero lists four facts, all true for v1", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("list", { name: "At a glance" }).getByRole("listitem")).toHaveText([
    `${themeIds.length} looks`,
    "Scenes, chat and alerts",
    "One link per overlay",
    "Free, no account",
    "Open source",
  ]);
});

test("each overlay card opens its part of the editor", async ({ page }) => {
  await page.goto("/");
  const cards = page
    .getByRole("region", { name: "Seven overlays in every look" })
    .getByRole("link");
  await expect(cards).toHaveCount(7);
  const hrefs = await cards.evaluateAll((els) => els.map((el) => el.getAttribute("href")));
  expect(hrefs).toEqual(
    ["starting", "brb", "ending", "offline", "chat", "frame", "alerts"].map(
      (p) => `/editor?part=${p}`,
    ),
  );

  await cards.filter({ hasText: "Be Right Back" }).click();
  // The landing page has look buttons too (the stream stage), and stays on screen while the editor loads, so wait
  // for the editor's own gallery before picking one.
  await expect(page.getByRole("heading", { name: "Pick a look to start" })).toBeVisible();
  // A first visit picks a look first; the part opens after that.
  await page.getByRole("button", { name: "Cozy Café", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Be Right Back" })).toBeChecked();
  await expect(page.locator("#part-scenes")).toBeInViewport();
});

test("the chat card opens the chat settings", async ({ page }) => {
  await page.goto("/editor?part=chat");
  await page.getByRole("button", { name: "Neon Grid", exact: true }).click();
  await expect(page.locator("#part-chat")).toBeInViewport();
});

test("the webcam frame card opens the frame settings (T6.102)", async ({ page }) => {
  await page.goto("/editor?part=frame");
  await page.getByRole("button", { name: "Neon Grid", exact: true }).click();
  await expect(page.locator("#part-frame")).toBeInViewport();
});

test("the nav marks the section in view", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const how = page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "How it works" });
  await expect(how).not.toHaveAttribute("aria-current");
  await page.locator("#how").scrollIntoViewIfNeeded();
  await page.evaluate(() => scrollBy(0, -200));
  await expect(how).toHaveAttribute("aria-current", "location");
});

test("the landing page says what works where (T6.69, T6.79)", async ({ page }) => {
  await page.goto("/");
  const know = page.getByRole("region", { name: "Good to know" });
  await expect(know.locator("summary")).toHaveText([
    "What you’ll need",
    "Works in OBS and Streamlabs",
    "Extras for your channel",
    "Your links never break",
  ]);
  // The answers open in place (T6.124).
  const answer = know.getByText("Paste a link once.");
  await expect(answer).toBeHidden();
  await know.getByText("Your links never break").click();
  await expect(answer).toBeVisible();
  // One row per overlay, one column per platform, in words.
  const table = page.getByRole("table", { name: "Which overlays work on which platform" });
  const row = (name: string) => table.getByRole("row").filter({ hasText: name }).locator("td");
  await expect(row("Scenes")).toHaveText(["Yes", "Yes", "Yes"]);
  await expect(row("Chat")).toHaveText(["Yes", "Not yet", "Not yet"]);
  await expect(row("Webcam frame")).toHaveText(["Yes", "Yes", "Yes"]);
  await expect(row("Raids, subs")).toHaveText(["Yes", "Not yet", "No"]);
  await expect(row("Follow alerts")).toHaveText(["Not yet", "No", "No"]);
  await expect(page.getByText("“Not yet” means it’s planned for a later version")).toBeVisible();
  // T6.152, after 21st.dev's "Feature Comparison Table": grouped rows and the best-supported column marked.
  await expect(table.getByRole("columnheader", { name: "On screen" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: "From your chat" })).toBeVisible();
  await expect(table.getByRole("columnheader", { name: /Twitch/ })).toContainText("Best supported");
  // T6.152, after 21st.dev's "CTA Banner": the closing panel also points to the setup guide.
  await expect(
    page.getByRole("region", { name: "Make your stream look pro." }).getByRole("link", {
      name: "Read the setup guide",
    }),
  ).toHaveAttribute("href", "/guide");
});

test("previews off screen are built after load, without scrolling (T6.78)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.locator("figure[data-kit] .scene")).toHaveCount(1); // the hero right away
  // The rest are built one per idle moment, so they're ready before anyone scrolls to them.
  // On a slow machine that can take a while: the promise is that they build without a scroll, not how fast.
  await expect(page.locator("[data-look]").last().locator(".scene")).toHaveCount(1, {
    timeout: 30_000,
  });
  await expect(page.locator("[data-look] .scene")).toHaveCount(themeIds.length);
});

test("the landing page offers optional support and says Overlune stays free (T6.80)", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Overlune is free and stays free.")).toBeVisible();
  await expect(page.getByRole("link", { name: "support it on GitHub Sponsors" })).toHaveAttribute(
    "href",
    "https://github.com/sponsors/tuskilicious",
  );
});

// T6.124: the looks as a list beside one big live preview, after the owner's reference.
test("the looks list drives one big preview by hover, focus and scroll, with a picture per look when narrow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const preview = page.locator(".landing-look-preview .scene");
  const row = (name: string) => page.locator("[data-look-row]").filter({ hasText: name });
  await page.locator("#looks").scrollIntoViewIfNeeded();
  await row("Session").locator(".landing-look-row").hover();
  await expect(preview).toHaveAttribute("data-theme", "session");
  await expect(row("Session")).toHaveAttribute("aria-current", "true");
  await row("Daylight").locator(".landing-look-row").focus();
  await expect(preview).toHaveAttribute("data-theme", "daylight");
  // The scene buttons switch the preview's scene.
  await page.getByRole("button", { name: "Be Right Back", exact: true }).click();
  await expect(page.locator(".landing-look-preview .scene-title")).toContainText("right back");
  // Scrolling a row to the middle of the window hands it the preview.
  await page.mouse.move(5, 450);
  await row("Neon Grid").evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(preview).toHaveAttribute("data-theme", "neon-grid");
  await expect(page.getByRole("link", { name: "Use Neon Grid" })).toHaveAttribute(
    "href",
    "/editor",
  );

  await page.setViewportSize({ width: 800, height: 900 });
  await expect(page.locator(".landing-look-stage")).toBeHidden();
  await expect(page.locator("[data-look]").first()).toBeVisible();
});

test("on wide windows the hero card zooms out into a collage of the looks; reduced motion keeps it still (T6.124)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const scale = () =>
    page
      .locator("[data-hero-card]")
      .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).a);
  expect(await scale()).toBe(1);
  await page.evaluate(() => scrollTo(0, 600));
  await expect.poll(scale).toBeLessThan(0.8);
  await expect(page.locator("[data-collage]")).toBeVisible();

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.evaluate(() => scrollTo(0, 600));
  await page.waitForTimeout(500);
  expect(await scale()).toBe(1);
  await expect(page.locator("[data-collage]")).toBeHidden();
});

test("a look opens full screen on click and closes with Esc or Close", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  const look = page.getByRole("dialog", { name: "Neon Grid, full screen" });
  const fullscreen = () => page.evaluate(() => document.fullscreenElement?.className ?? null);

  await page.getByRole("button", { name: "See Neon Grid full screen" }).click();
  await expect(look).toBeVisible();
  await expect(look.getByText("Starting soon")).toBeVisible();
  await expect(page.getByRole("button", { name: "Close (Esc)" })).toBeFocused();
  await expect.poll(fullscreen).toBe("landing-look-full-body");
  // The scene fills the screen's width at 16:9.
  const stage = (await look.locator(".landing-look-full-stage").boundingBox())!;
  expect(Math.round(stage.width)).toBe(1440);
  expect(Math.round(stage.height)).toBe(810);

  await page.getByRole("button", { name: "Close (Esc)" }).click();
  await expect(look).toBeHidden();
  await expect.poll(fullscreen).toBeNull();
  await expect(page.getByRole("button", { name: "See Neon Grid full screen" })).toBeFocused();

  await page.getByRole("button", { name: "See Daylight full screen" }).click();
  await expect(page.getByRole("dialog", { name: "Daylight, full screen" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect.poll(fullscreen).toBeNull();
});

test("the hero's night rises in, parts on scroll, and holds still for reduced motion (T6.129)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const night = page.locator(".landing-night");
  await expect(night).toHaveAttribute("aria-hidden", "true");
  await expect(night.locator("[data-ridge]")).toHaveCount(3);
  // The headline arrives a word at a time but still reads as one sentence.
  await expect(page.locator(".landing-word")).toHaveCount(6);
  await expect(page.locator(".landing-word").first()).toHaveCSS("animation-name", "word-rise");
  await expect(page.locator(".landing-motes")).toHaveCSS("animation-name", "motes-rise");
  // Scrolling parts the ridges, the nearest furthest.
  await page.mouse.wheel(0, 600);
  await expect
    .poll(async () => {
      const ys = await page
        .locator("[data-ridge]")
        .evaluateAll((els) => els.map((el) => new DOMMatrix(getComputedStyle(el).transform).f));
      return ys[0]! > 0 && ys[2]! > ys[0]!;
    })
    .toBe(true);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "Free stream overlays that look pro.",
  );
  for (const sel of [".landing-word", ".landing-motes", ".landing-ridges > svg"])
    await expect(page.locator(sel).first()).toHaveCSS("animation-name", "none");
});

// T6.148: the overlay cards' magnifier (after 21st.dev's Magnified Bento) follows the mouse, and is only built
// while the pointer is over a card.
test("an overlay card's picture shows a magnifier under the mouse", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const thumb = page.locator('.landing-cards > [data-part="starting"] .aspect-video');
  await thumb.scrollIntoViewIfNeeded();
  await expect(page.locator(".landing-lens")).toHaveCount(0);
  const box = (await thumb.boundingBox())!;
  await page.mouse.move(box.x + box.width * 0.3, box.y + box.height * 0.5);
  await expect(thumb.locator(".landing-lens .scene")).toHaveCount(1);
  await expect(thumb.locator(".landing-lens-ring")).toBeVisible();
  await page.mouse.move(5, 5);
  await expect(page.locator(".landing-lens")).toHaveCount(0);
});

// T6.148: the steps' line and stops show their finished state with reduced motion.
test("with reduced motion the steps' line is drawn and every stop is filled", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const stops = page.locator(".landing-step-num");
  await expect(stops).toHaveText(["1", "2", "3"]);
  for (const stop of await stops.all())
    await expect(stop).toHaveCSS("background-color", "rgb(164, 94, 252)");
  expect(
    await page
      .locator(".landing-steps")
      .evaluate((el) => getComputedStyle(el, "::after").transform),
  ).toBe("none");
});

// T6.148: on wide windows with a mouse the page's scrollbar is a ruler (after getartcraft.com's): it replaces the
// browser's scrollbar, follows the scroll, names the section, and moves the page on a click. Phones keep their own.
test("wide windows scroll with the ruler; phones keep the browser's scrollbar", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const ruler = page.getByRole("scrollbar", { name: "Page position" });
  await expect(ruler).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator("html")).toHaveAttribute("data-ruler", "");
  await page
    .locator("#looks")
    .evaluate((el) => scrollTo(0, el.getBoundingClientRect().top + scrollY + 200));
  await expect(ruler.locator(".landing-ruler-section")).toHaveText("Looks");
  expect(Number(await ruler.getAttribute("aria-valuenow"))).toBeGreaterThan(30);
  const box = (await ruler.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height - 2);
  await expect(ruler).toHaveAttribute("aria-valuenow", "100");
  expect((await scan(page)).violations).toEqual([]);

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(ruler).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-ruler");
});
