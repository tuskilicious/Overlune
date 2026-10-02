import { expect, test } from "@playwright/test";
import lz from "lz-string";
import { themeIds } from "../../src/themes/types";

// T6.26: the longest allowed text, a countdown, three socials and a logo stay inside 1920×1080 on every theme.
const longest = (theme: string) => ({
  theme,
  logo: "https://logos.example/logo.png",
  starting: {
    title: "Starting very soon, grab a snack and get comfy for the strea",
    subtitle:
      "Tonight: ranked grind until we hit diamond, plus viewer games after. Drop a follow if you are new around here!!",
    endsAt: Date.now() + 2 * 86_400_000,
  },
  socials: [
    { platform: "twitch", handle: "somestreamer_tv" },
    { platform: "youtube", handle: "SomeStreamerYT" },
    { platform: "x", handle: "somestreamer" },
  ],
});

for (const theme of themeIds) {
  test(`${theme}: long text, countdown and socials all fit on screen`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.route("https://logos.example/logo.png", (r) =>
      r.fulfill({ path: "public/images/brand/apple-touch-icon.png" }),
    );
    await page.goto(
      `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(longest(theme)))}`,
    );
    await expect(page.locator(".scene-logo")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    for (const sel of [".scene-title", ".scene-subtitle", ".countdown-at", ".scene-socials"]) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.y, sel).toBeGreaterThanOrEqual(0);
      expect(box.y + box.height, sel).toBeLessThanOrEqual(1080);
    }
  });
}

test("a short title keeps the theme's full size", async ({ page }) => {
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify({ theme: "arcade-8bit" }))}`,
  );
  await page.evaluate(() => document.fonts.ready);
  await expect(page.locator(".scene-title")).not.toHaveAttribute("style", /font-size/);
});

test("Neon Grid keeps the title block in the sky, above the horizon (T6.36)", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.route("https://logos.example/logo.png", (r) =>
    r.fulfill({ path: "public/images/brand/apple-touch-icon.png" }),
  );
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(longest("neon-grid")))}`,
  );
  await page.evaluate(() => document.fonts.ready);
  const horizon = 1080 * 0.82;
  for (const sel of [".scene-title", ".scene-subtitle", ".countdown"]) {
    const box = (await page.locator(sel).boundingBox())!;
    expect(box.y + box.height, sel).toBeLessThanOrEqual(horizon);
  }
});

for (const theme of themeIds) {
  test(`${theme}: on the broadcast layout, "Starting soon" stays on one line beside the countdown`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    const data = { theme, starting: { endsAt: Date.now() + 2 * 86_400_000 } };
    await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
    await page.evaluate(() => document.fonts.ready);
    test.skip(
      (await page.locator(".scene").getAttribute("data-layout")) !== "broadcast",
      "not redesigned yet",
    );
    // The accent rule is drawn inside the heading (::before), so leave it out of the line count.
    const lines = await page.locator(".scene-title").evaluate((el) => {
      const rule = getComputedStyle(el, "::before");
      const text =
        el.getBoundingClientRect().height - parseFloat(rule.height) - parseFloat(rule.marginBottom);
      return text / parseFloat(getComputedStyle(el).lineHeight);
    });
    expect(lines).toBeLessThan(1.5);
  });
}

test("Pastel Cloud's clouds drift above the title block, never through it (T6.39)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(
      JSON.stringify({
        theme: "pastel-cloud",
        starting: { subtitle: "Ranked grind tonight", endsAt: Date.now() + 86_400_000 },
        socials: [{ platform: "twitch", handle: "tusk" }],
      }),
    )}`,
  );
  await page.evaluate(() => document.fonts.ready);
  // Typical content; a 60-character title fills the screen and any background sits behind it.
  // The lower cloud (::after) is scaled around its center, so its drawn bottom is top + height * (1 + scale) / 2.
  const cloudBottom = await page.locator(".scene").evaluate((el) => {
    const c = getComputedStyle(el, "::after");
    return parseFloat(c.top) + (parseFloat(c.height) * (1 + parseFloat(c.scale))) / 2;
  });
  const titleTop = (await page.locator(".scene-title").boundingBox())!.y;
  expect(cloudBottom).toBeLessThanOrEqual(titleTop);
});
