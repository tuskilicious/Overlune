import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import lz from "lz-string";

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

test("returning visitors with saved work skip the landing page", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Neon Grid" }).click();
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page).toHaveURL(/\/editor/);
  await expect(page.getByRole("radio", { name: "Neon Grid" })).toBeChecked();
});

test("the editor and overlays never load the landing page's animation library", async ({
  page,
}) => {
  const gsap: string[] = [];
  page.on("request", (r) => /gsap|LandingPage/i.test(r.url()) && gsap.push(r.url()));
  await page.goto("/editor");
  await page.getByRole("button", { name: "Clean Slate" }).click();
  await page.goto("/o/starting");
  await expect(page.locator(".scene")).toBeVisible();
  expect(gsap).toEqual([]);
});

test("with reduced motion the page is still and fully visible", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("heading", { name: "Live in three steps" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("heading", { name: "Live in three steps" })).toHaveCSS(
    "opacity",
    "1",
  );
  await expect(page.locator(".landing-marquee")).toHaveCSS("animation-name", "none");
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
    await expect(looks).toHaveCount(8);
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

test("the alert pictures show whole alert cards, large enough to read (T6.48)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  // Measure the settled cards: with the fallback font, before the web fonts load, Cozy Café's sub alert wraps to
  // two lines and spills past the fixed crop (T6.59 makes the crop follow the card). Motion off too, since the
  // bounce overshoots mid-entrance.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await expect(page.locator(".landing-alert .alert-box")).toHaveCount(2);
  await page.evaluate(() => document.fonts.ready);
  const crops = await page.locator(".landing-alert .editor-preview").evaluateAll((els) =>
    els.map((el) => {
      const crop = el.getBoundingClientRect();
      const box = el.querySelector(".alert-box")!.getBoundingClientRect();
      return { crop, box };
    }),
  );
  for (const { crop, box } of crops) {
    expect(box.width).toBeGreaterThan(crop.width * 0.9); // the card fills the picture, not a strip in a canvas
    expect(box.bottom).toBeLessThanOrEqual(crop.bottom); // and none of it is cut off
  }
});
