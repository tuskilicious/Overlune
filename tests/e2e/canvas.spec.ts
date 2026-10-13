import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";

// The canvas (T9.4): Customize, then select, drag, snap, resize, turn, nudge and undo.

test.use({ viewport: { width: 1440, height: 900 } });

const editorWith = (settings: unknown) =>
  `/editor#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;

/** The starting scene's layout as the editor's link holds it now. */
const layoutInLink = (page: Page) =>
  page.evaluate(() => {
    const hash = location.hash.slice(1);
    // The editor's own decoder, from the dev server.
    return import("/src/settings/url.ts" as string).then(
      (m: {
        decode: (h: string) => {
          settings: {
            layouts: {
              landscape?: {
                scenes: {
                  starting?: {
                    type: string;
                    x: number;
                    y: number;
                    w: number;
                    h: number;
                    r: number;
                  }[];
                };
              };
            };
          };
        };
      }) => m.decode(hash).settings.layouts.landscape?.scenes.starting ?? null,
    );
  });

const canvasPoint = async (page: Page, x: number, y: number) => {
  const r = (await page.locator(".canvas").boundingBox())!;
  const scale = r.width / 1920;
  return { x: r.x + x * scale, y: r.y + y * scale, scale };
};

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(editorWith({ theme: "clean-slate", starting: { subtitle: "Chill games" } }));
  await page.getByRole("button", { name: "Customize" }).click();
  await expect(page.locator(".canvas")).toBeVisible();
});

test("Customize turns the preview into a canvas with the look's own layout, then Done returns", async ({
  page,
}) => {
  const layout = (await layoutInLink(page))!;
  expect(layout.map((e) => e.type)).toEqual(expect.arrayContaining(["title", "subtitle"]));
  await page.getByRole("button", { name: "Done" }).click();
  await expect(page.locator(".canvas")).toHaveCount(0);
  // The layout stays in the link; the preview shows it.
  expect(await layoutInLink(page)).toEqual(layout);
});

test("dragging an element moves it, as one undo step", async ({ page }) => {
  const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const from = await canvasPoint(page, title.x + 40, title.y + title.h / 2);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(from.x + 50, from.y - 60, { steps: 6 });
  await page.mouse.up();
  const moved = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  expect(Math.abs(moved.x - title.x - 50 / from.scale)).toBeLessThan(10);
  expect(moved.y).toBeLessThan(title.y);
  await page.keyboard.press("Control+z");
  expect((await layoutInLink(page))!.find((e) => e.type === "title")).toEqual(title);
});

test("dragging near the canvas's centre snaps to it, with a guide; Alt doesn't snap", async ({
  page,
}) => {
  const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const from = await canvasPoint(page, title.x + 20, title.y + 20);
  const centreX = 960 - title.w / 2 + 3; // 3px off centre
  const to = await canvasPoint(page, centreX + 20, title.y + 20);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 8 });
  await expect(page.locator('.canvas-guide[data-axis="x"]')).toBeVisible();
  await page.mouse.up();
  const snapped = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  expect(snapped.x + snapped.w / 2).toBeCloseTo(960, 0);
  await expect(page.locator(".canvas-guide")).toHaveCount(0);
});

test("a corner handle resizes, and the turning handle turns", async ({ page }) => {
  const title = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  const inside = await canvasPoint(page, title.x + 20, title.y + 20);
  await page.mouse.click(inside.x, inside.y);
  const se = (await page.locator('.canvas-handle[data-handle="se"]').boundingBox())!;
  await page.mouse.move(se.x + se.width / 2, se.y + se.height / 2);
  await page.mouse.down();
  await page.mouse.move(se.x + 40, se.y + 30, { steps: 5 });
  await page.mouse.up();
  const bigger = (await layoutInLink(page))!.find((e) => e.type === "title")!;
  expect(bigger.w).toBeGreaterThan(title.w);
  expect(bigger.h).toBeGreaterThan(title.h);
  expect([bigger.x, bigger.y]).toEqual([title.x, title.y]);

  const knob = (await page.locator(".canvas-rotate").boundingBox())!;
  const centre = await canvasPoint(page, bigger.x + bigger.w / 2, bigger.y + bigger.h / 2);
  await page.mouse.move(knob.x + 5, knob.y + 5);
  await page.mouse.down();
  await page.mouse.move(centre.x + 200, centre.y, { steps: 6 }); // straight to the right: 90°
  await page.mouse.up();
  expect((await layoutInLink(page))!.find((e) => e.type === "title")!.r).toBe(90);
});

test("by keyboard: Tab picks an element, arrows nudge it, Shift moves 10, Alt resizes", async ({
  page,
}) => {
  const first = (await layoutInLink(page))![0]!;
  await page.locator(".canvas").focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".canvas-selection")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Shift+ArrowDown");
  await page.keyboard.press("Alt+ArrowRight");
  const now = (await layoutInLink(page))![0]!;
  expect([now.x, now.y, now.w]).toEqual([first.x + 1, first.y + 10, first.w + 1]);
  await expect(page.getByRole("status").filter({ hasText: "selected, at" })).toContainText(
    `at ${now.x}, ${now.y}`,
  );
  await page.keyboard.press("Escape");
  await expect(page.locator(".canvas-selection")).toHaveCount(0);
});
