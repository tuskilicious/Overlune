import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import { themeIds } from "../../src/themes/types";

// The portrait canvas (T10.2): `?canvas=vertical` draws the scenes and Live at 1080×1920, every word inside the
// safe zone (DESIGN.md "Vertical layout": x 60–940, y 240–1240), and leaves every landscape link as it was.

test.use({ viewport: { width: 1080, height: 1920 } });

const hash = (settings: unknown) =>
  `#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;
const scenes = ["starting", "brb", "ending", "offline", "chatting", "reaction"] as const;

/** Sample content with every part, including a long title and handle, the countdown and the ticker. */
const sample = (theme: string, ticker: boolean) => ({
  theme,
  socials: [
    { platform: "twitch", handle: "tuskilicious" },
    { platform: "youtube", handle: "tusk" },
    { platform: "tiktok", handle: "tusk" },
  ],
  starting: {
    subtitle: "Ranked grind tonight",
    endsAt: Date.now() + 26 * 3600_000,
    tz: "UTC",
  },
  brb: { subtitle: "Grabbing a drink" },
  chatting: { subtitle: "Your desk setups and what we build next" },
  ticker: { show: ticker },
});

/** Every visible piece of text outside the safe zone. Ticker text scrolled out of its band is clipped, so not
 *  seen; text boxes may overhang their letters, by a few px or a fifth of a big title's box. */
const outside = (page: Page) =>
  page.evaluate(() => {
    const zone = { left: 60, top: 240, right: 940, bottom: 1240 };
    const slack = 4;
    const out: string[] = [];
    const scene = document.querySelector(".scene")!;
    const walk = document.createTreeWalker(scene, NodeFilter.SHOW_TEXT);
    for (let n = walk.nextNode(); n; n = walk.nextNode()) {
      if (!n.textContent?.trim()) continue;
      const clip = n.parentElement?.closest(".scene-ticker")?.getBoundingClientRect();
      const range = document.createRange();
      range.selectNodeContents(n);
      for (const r of range.getClientRects()) {
        if (!r.width) continue;
        // A big title's text box reaches past its letters, by up to about a fifth of its height.
        const v = Math.max(slack, r.height * 0.18);
        if (clip && (r.right <= clip.left || r.left >= clip.right)) continue;
        const left = clip ? Math.max(r.left, clip.left) : r.left;
        const right = clip ? Math.min(r.right, clip.right) : r.right;
        if (
          left < zone.left - slack ||
          right > zone.right + slack ||
          r.top < zone.top - v ||
          r.bottom > zone.bottom + v
        )
          out.push(
            `"${n.textContent.trim().slice(0, 20)}" at ${[left, r.top, right, r.bottom].map(Math.round)}`,
          );
      }
    }
    return out;
  });

for (const theme of themeIds)
  test(`${theme}: every vertical scene fills 1080×1920 with its words in the safe zone`, async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const scene of scenes) {
      await page.goto(`/o/${scene}?canvas=vertical${hash(sample(theme, scene === "brb"))}`);
      await page.evaluate(() => document.fonts.ready);
      const box = (await page.locator(".scene").boundingBox())!;
      expect([box.width, box.height], scene).toEqual([1080, 1920]);
      await expect(page.locator(".scene")).toHaveAttribute("data-canvas", "portrait");
      expect(await outside(page), `${theme} ${scene}`).toEqual([]);
    }
  });

test("without the flag, the same save is the landscape scene, exactly as before", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/o/starting${hash(sample("neon-grid", false))}`);
  const box = (await page.locator(".scene").boundingBox())!;
  expect([box.width, box.height]).toEqual([1920, 1080]);
  await expect(page.locator(".scene")).not.toHaveAttribute("data-canvas");
  // Any other value is landscape too (STACK.md).
  await page.goto(`/o/starting?canvas=sideways${hash(sample("neon-grid", false))}`);
  await expect(page.locator(".scene")).not.toHaveAttribute("data-canvas");
});

test("a vertical Live puts the frame at the top, chat low and alerts in between", async ({
  page,
}) => {
  await page.goto(`/o/live?canvas=vertical${hash({ chat: { channel: "dallas" } })}`);
  const live = (await page.locator(".live").boundingBox())!;
  expect([live.width, live.height]).toEqual([1080, 1920]);
  const at = async (type: string) => {
    const b = (await page.locator(`.layout-el-${type}`).boundingBox())!;
    return [b.x, b.y, b.width, b.height].map(Math.round);
  };
  expect(await at("frame")).toEqual([60, 96, 960, 540]);
  expect(await at("chat")).toEqual([60, 760, 880, 480]);
});

test("a portrait layout in the save is used, and the landscape one is left alone", async ({
  page,
}) => {
  const settings = {
    layouts: {
      landscape: {
        scenes: { starting: [{ id: "a", type: "title", x: 100, y: 100, w: 800, h: 200 }] },
      },
      portrait: {
        scenes: { starting: [{ id: "b", type: "title", x: 60, y: 900, w: 880, h: 200 }] },
      },
    },
  };
  await page.goto(`/o/starting?canvas=vertical${hash(settings)}`);
  const title = (await page.locator(".scene-title").boundingBox())!;
  expect(Math.round(title.y + title.height / 2)).toBe(1000);
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(`/o/starting${hash(settings)}`);
  const wide = (await page.locator(".scene-title").boundingBox())!;
  expect(Math.round(wide.y + wide.height / 2)).toBe(200);
});
