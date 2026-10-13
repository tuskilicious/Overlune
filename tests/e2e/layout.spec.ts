import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import fixture from "../fixtures/links/v1/layout-starting.json" with { type: "json" };

// A customized scene (T9.2, T9.3, docs/STACK.md "Layout model"): the look's own parts moved to their boxes, added
// elements drawn over the scene.

test.use({ viewport: { width: 1920, height: 1080 } });
test.beforeEach(({ page }) => page.emulateMedia({ reducedMotion: "reduce" }));

const link = (settings: unknown) =>
  `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;

/** A box on the page, rounded, for comparing with a layout's integer boxes. */
const box = async (page: Page, selector: string) => {
  const b = (await page.locator(selector).boundingBox())!;
  return {
    x: Math.round(b.x),
    y: Math.round(b.y),
    w: Math.round(b.width),
    h: Math.round(b.height),
  };
};

test("the look's own parts move to their boxes, in its own style", async ({ page }) => {
  await page.goto(fixture.link);
  await expect(page.locator(".scene[data-layout]")).toHaveAttribute("data-theme", "neon-grid");
  await page.evaluate(() => document.fonts.ready);
  await expect.poll(() => box(page, ".scene-title")).toEqual({ x: 120, y: 640, w: 1000, h: 220 });
  await expect.poll(() => box(page, ".countdown")).toEqual({ x: 1300, y: 640, w: 520, h: 200 });
  await expect(page.locator(".scene-title")).toHaveText("Going live soon");
  await expect(page.locator(".scene-subtitle")).toHaveText("Ranked grind");
  await expect(page.locator(".scene-socials li")).toHaveText(/yourname/);
});

test("added elements carry their own content and style; hidden ones aren't drawn", async ({
  page,
}) => {
  await page.goto(fixture.link);
  await expect(page.locator('[data-id="x1"]')).toHaveText("Tonight: ranked with viewers");
  await expect(page.locator('[data-id="x1"]')).toHaveCSS("rotate", "-2deg");
  await expect(page.locator('[data-id="bg1"]')).toHaveCSS("opacity", "0.8");
  await expect(page.locator('[data-id="h1"]')).toHaveCount(0);
});

test("a part left out of the layout, or hidden, isn't shown", async ({ page }) => {
  await page.goto(
    link({
      starting: { subtitle: "Shown nowhere" },
      layouts: {
        landscape: {
          scenes: {
            starting: [
              { id: "t1", type: "title", x: 100, y: 100, w: 900, h: 200 },
              { id: "s1", type: "subtitle", x: 100, y: 320, w: 600, h: 60, hidden: true },
            ],
          },
        },
      },
    }),
  );
  await expect(page.locator(".scene-title")).toBeVisible();
  await expect(page.locator(".scene-subtitle")).toBeHidden();
});

test("a scene without a layout in the same link is the look's composed scene", async ({ page }) => {
  await page.goto(fixture.link.replace("/o/starting", "/o/brb"));
  await expect(page.locator(".scene-main")).toBeVisible();
  await expect(page.locator(".scene[data-layout]")).toHaveCount(0);
});

test("added text shrinks to fit its box", async ({ page }) => {
  await page.goto(
    link({
      layouts: {
        landscape: {
          scenes: {
            starting: [
              {
                id: "x1",
                type: "text",
                x: 100,
                y: 100,
                w: 400,
                h: 80,
                font: "heading",
                text: "A long line of added text that cannot fit at its full size",
              },
            ],
          },
        },
      },
    }),
  );
  const text = page.locator('[data-id="x1"] .layout-text');
  await expect
    .poll(() =>
      text.evaluate((el) => (el as HTMLElement).offsetHeight <= el.parentElement!.clientHeight + 1),
    )
    .toBe(true);
  expect(parseFloat(await text.evaluate((el) => getComputedStyle(el).fontSize))).toBeLessThan(64);
});
