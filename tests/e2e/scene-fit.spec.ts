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
    // Measure where things land, not mid-entrance (they rise in from below).
    await page.evaluate(() =>
      Promise.allSettled(
        document
          .getAnimations()
          .filter((a) => a.effect?.getTiming().iterations !== Infinity)
          .map((a) => a.finished),
      ),
    );
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
  // Measure the settled layout: the entrance slides the content up 24px, so under load it could read low.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("https://logos.example/logo.png", (r) =>
    r.fulfill({ path: "public/images/brand/apple-touch-icon.png" }),
  );
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(longest("neon-grid")))}`,
  );
  await expect(page.locator(".scene-logo")).toBeVisible(); // the title re-fits once the logo has loaded
  await page.evaluate(() => document.fonts.ready);
  const horizon = 1080 * 0.82;
  for (const sel of [".scene-title", ".scene-subtitle", ".countdown"]) {
    const box = (await page.locator(sel).boundingBox())!;
    expect(box.y + box.height, sel).toBeLessThanOrEqual(horizon);
  }
});

for (const theme of themeIds) {
  test(`${theme}: "Starting soon" sets on at most two lines at full size beside the countdown`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    // The widest countdown a stream day shows, "1d 23h 59m", on a fixed clock so the tick can't change it (T6.52).
    const now = new Date("2026-10-02T12:00:00Z").getTime();
    await page.clock.setFixedTime(now);
    const data = { theme, starting: { endsAt: now + 2 * 86_400_000 - 60_000 } };
    await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
    await expect(page.locator(".countdown-time")).toHaveText("1d 23h 59m");
    await page.evaluate(() => document.fonts.ready);
    // The accent rule is drawn inside the heading (::before), so leave it out of the line count.
    const lines = await page.locator(".scene-title").evaluate((el) => {
      const rule = getComputedStyle(el, "::before");
      const text =
        el.getBoundingClientRect().height - parseFloat(rule.height) - parseFloat(rule.marginBottom);
      return text / parseFloat(getComputedStyle(el).lineHeight);
    });
    // The two-line headline is the design (T6.107); a third line, or a shrink, means the column got squeezed.
    expect(lines).toBeLessThan(2.5);
    await expect(page.locator(".scene-title")).not.toHaveAttribute("style", /font-size/);
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

test("Forest Night's fireflies keep to the open left of the sky, clear of the headline (T6.134)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(
      JSON.stringify({
        theme: "forest-night",
        starting: { subtitle: "Ranked grind tonight", endsAt: Date.now() + 86_400_000 },
        socials: [{ platform: "twitch", handle: "tusk" }],
      }),
    )}`,
  );
  await page.evaluate(() => document.fonts.ready);
  // Typical content. The headline hangs right-aligned under the moon; the firefly layers fade out across the width
  // (the mask's first layer, "to right"), so its last stop is where they end.
  const fadeEnd = await page.locator(".scene").evaluate((el) => {
    const mask = getComputedStyle(el, "::before").maskImage;
    const toRight = mask.slice(0, mask.indexOf("), linear-gradient"));
    const stops = [...toRight.matchAll(/([\d.]+)%/g)].map((m) => parseFloat(m[1]!));
    return (el.clientWidth * (stops.at(-1) ?? 100)) / 100;
  });
  const title = (await page.locator(".scene-title").boundingBox())!;
  expect(fadeEnd).toBeLessThanOrEqual(title.x);
});

test("Bold Esports keeps its angles without cutting the socials divider (T6.41)", async ({
  page,
}) => {
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(
      JSON.stringify({
        theme: "bold-esports",
        starting: { endsAt: Date.now() + 86_400_000 },
        socials: [{ platform: "twitch", handle: "tusk" }],
      }),
    )}`,
  );
  // Read the shapes after the wipe-in, which animates clip-path. allSettled: a countdown digit that changes
  // remounts and cancels its flip (T6.117), which rejects that animation's promise.
  // Loops (the slabs, the countdown's edge light, T6.123) never finish, so wait only for the ones that end.
  await page.evaluate(() =>
    Promise.allSettled(
      document
        .getAnimations()
        .filter((a) => a.effect?.getTiming().iterations !== Infinity)
        .map((a) => a.finished),
    ),
  );
  const clip = (sel: string) => page.locator(sel).evaluate((el) => getComputedStyle(el).clipPath);
  expect(await clip(".countdown")).toContain("polygon");
  // A slanted box clip on the socials row would trim the start of the divider line.
  expect(await clip(".scene-socials")).toBe("none");
});

test("Vaporwave Sunset's sun stays clear of the title, countdown and socials (T6.42)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(
    `/o/starting#1.${lz.compressToEncodedURIComponent(
      JSON.stringify({
        theme: "vaporwave-sunset",
        starting: { subtitle: "Ranked grind tonight", endsAt: Date.now() + 86_400_000 },
        socials: [
          { platform: "twitch", handle: "somestreamer_tv" },
          { platform: "youtube", handle: "SomeStreamerYT" },
          { platform: "x", handle: "somestreamer" },
        ],
      }),
    )}`,
  );
  await page.evaluate(() => document.fonts.ready);
  const sun = await page.locator(".scene").evaluate((el) => {
    const s = getComputedStyle(el, "::before");
    const width = parseFloat(s.width);
    const x = el.clientWidth - parseFloat(s.right) - width;
    return { x, y: parseFloat(s.top), width, height: parseFloat(s.height) };
  });
  for (const sel of [".scene-title", ".countdown", ".scene-socials"]) {
    const box = (await page.locator(sel).boundingBox())!;
    const apart =
      box.x >= sun.x + sun.width ||
      box.x + box.width <= sun.x ||
      box.y >= sun.y + sun.height ||
      box.y + box.height <= sun.y;
    expect(apart, `${sel} overlaps the sun`).toBe(true);
  }
});

// T6.52: the countdown card widens as it ticks ("2d 0h 0m" becomes "1d 23h 59m"), narrowing the title's column.
for (const theme of themeIds) {
  test(`${theme}: a long title re-fits when the countdown card widens`, async ({ page }) => {
    const start = new Date("2026-10-02T12:00:00Z").getTime();
    await page.clock.setFixedTime(start); // the overlay's timers keep running; only the time is ours
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.route("https://logos.example/logo.png", (r) =>
      r.fulfill({ path: "public/images/brand/apple-touch-icon.png" }),
    );
    const data = longest(theme);
    data.starting.endsAt = start + 2 * 86_400_000; // "2d 0h 0m", then "1d 23h 59m" a second later
    await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
    await expect(page.locator(".countdown-time")).toHaveText("2d 0h 0m");
    await page.evaluate(() => document.fonts.ready);
    await page.clock.setFixedTime(start + 1500);
    await expect(page.locator(".countdown-time")).toHaveText("1d 23h 59m");
    await expect
      .poll(async () => {
        const box = (await page.locator(".scene-socials").boundingBox())!;
        return box.y + box.height;
      })
      .toBeLessThanOrEqual(1080);
  });
}

// T6.54: the card keeps a minimum width so it doesn't jump as it ticks; a short countdown sits in its middle.
test("a short countdown is centered in its card", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "reduce" }); // Cozy Café's bounce entrance scales the content
  const data = { theme: "cozy-cafe", starting: { endsAt: Date.now() + 10 * 60_000 } };
  await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
  await page.evaluate(() => document.fonts.ready);
  const card = (await page.locator(".countdown").boundingBox())!;
  for (const sel of [".countdown-time", ".countdown-at"]) {
    const box = (await page.locator(sel).boundingBox())!;
    expect(Math.abs(box.x + box.width / 2 - (card.x + card.width / 2)), sel).toBeLessThan(2);
  }
});

for (const theme of themeIds) {
  test(`${theme}: with the ticker, everything stays above the band (T6.121)`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.route("https://logos.example/logo.png", (r) =>
      r.fulfill({ path: "public/images/brand/apple-touch-icon.png" }),
    );
    const data = { ...longest(theme), ticker: { show: true, label: "Tusk", extra: "Tue at 7" } };
    await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
    await expect(page.locator(".scene-logo")).toBeVisible();
    await page.evaluate(() => document.fonts.ready);
    const band = (await page.locator(".scene-ticker").boundingBox())!;
    for (const sel of [".scene-title", ".scene-subtitle", ".countdown", ".scene-socials"]) {
      const box = (await page.locator(sel).boundingBox())!;
      expect(box.y + box.height, sel).toBeLessThanOrEqual(band.y);
    }
  });
}

test("the ticker loops the socials and the extra line, and holds still in Lite (T6.121)", async ({
  page,
}) => {
  const data = {
    socials: [{ platform: "twitch", handle: "tusk" }],
    ticker: { show: true, label: "Tusk", extra: "Tue at 7" },
  };
  const link = `/o/brb#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`;
  await page.goto(link);
  await expect(page.locator(".scene-ticker-tab")).toHaveText("Tusk");
  await expect(page.locator(".scene-ticker ul")).toHaveCount(2);
  await expect(page.locator(".scene-ticker ul").nth(1)).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator(".scene-ticker ul").first()).toContainText("tusk");
  await expect(page.locator(".scene-ticker ul").first()).toContainText("Tue at 7");
  await expect(page.locator(".scene-ticker-track")).toHaveCSS("animation-name", "scene-ticker");

  const lite = `/o/brb#1.${lz.compressToEncodedURIComponent(JSON.stringify({ ...data, liteMotion: true }))}`;
  await page.goto(lite);
  await expect(page.locator(".scene-ticker-track")).toHaveCSS("animation-name", "none");
});
