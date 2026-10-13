import { expect, test } from "@playwright/test";
import lz from "lz-string";
import fixture from "../fixtures/links/v1/layout-starting.json" with { type: "json" };

// A customized scene (T9.2, docs/STACK.md "Layout model"): elements in their boxes, in the look's own style.

test.use({ viewport: { width: 1920, height: 1080 } });

test("a customized Starting Soon puts each element in its box, in the look's style", async ({
  page,
}) => {
  await page.goto(fixture.link);
  const scene = page.locator(".scene.scene-layout");
  await expect(scene).toHaveAttribute("data-theme", "neon-grid");
  const at = async (id: string) => (await page.locator(`[data-id="${id}"]`).boundingBox())!;
  expect(await at("t1")).toMatchObject({ x: 120, y: 640, width: 1000, height: 220 });
  expect(await at("c1")).toMatchObject({ x: 1300, y: 640 });
  // Today's parts, reading today's settings: the title is the scene's title, the countdown and socials are real.
  await expect(page.locator('[data-id="t1"] .scene-title')).toHaveText("Going live soon");
  await expect(page.locator('[data-id="s1"] .scene-subtitle')).toHaveText("Ranked grind");
  await expect(page.locator('[data-id="c1"] .countdown')).toBeVisible();
  await expect(page.locator('[data-id="so1"] .scene-socials li')).toHaveText(/yourname/);
  // Added elements carry their own content and style.
  await expect(page.locator('[data-id="x1"]')).toHaveText("Tonight: ranked with viewers");
  await expect(page.locator('[data-id="x1"]')).toHaveCSS("rotate", "-2deg");
  await expect(page.locator('[data-id="bg1"]')).toHaveCSS("opacity", "0.8");
  // Hidden elements aren't drawn; the composed scene's layout isn't either.
  await expect(page.locator('[data-id="h1"]')).toHaveCount(0);
  await expect(page.locator(".scene-main")).toHaveCount(0);
});

test("a scene without a layout in the same link is the look's composed scene", async ({ page }) => {
  await page.goto(fixture.link.replace("/o/starting", "/o/brb"));
  await expect(page.locator(".scene-main")).toBeVisible();
  await expect(page.locator(".scene-layout")).toHaveCount(0);
});

test("a long title shrinks to fit its box", async ({ page }) => {
  const settings = {
    starting: { title: "A very long title that would never fit in a small box at all" },
    layouts: {
      landscape: {
        scenes: { starting: [{ id: "t1", type: "title", x: 100, y: 100, w: 600, h: 120 }] },
      },
    },
  };
  await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`);
  const title = page.locator('[data-id="t1"] .scene-title');
  await expect(title).toBeVisible();
  await expect
    .poll(() => title.evaluate((el) => el.scrollHeight <= el.parentElement!.clientHeight))
    .toBe(true);
  expect(parseFloat(await title.evaluate((el) => getComputedStyle(el).fontSize))).toBeLessThan(184);
});
