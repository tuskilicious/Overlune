import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";

// Canvas sizes (T9.8): the scenes and Live drawn at the streamer's OBS canvas size.

const hash = (settings: unknown) =>
  `#1.${lz.compressToEncodedURIComponent(JSON.stringify(settings))}`;

/** The editor's link, decoded by the editor's own decoder. */
const linkSettings = (page: Page) =>
  page.evaluate(() =>
    import("/src/settings/url.ts" as string).then(
      (m: {
        decode: (h: string) => {
          settings: {
            layouts: {
              landscape?: {
                size: { width: number; height: number };
                scenes: {
                  starting?: { type: string; x: number; y: number; w: number; h: number }[];
                };
              };
            };
          };
        };
      }) => m.decode(location.hash.slice(1)).settings.layouts.landscape,
    ),
  );

test.describe("on the overlay", () => {
  test.use({ viewport: { width: 1280, height: 720 } });

  test("a 1280×720 canvas shows the whole scene, scaled to fill it", async ({ page }) => {
    await page.goto(
      `/o/starting${hash({ layouts: { landscape: { size: { width: 1280, height: 720 } } } })}`,
    );
    const b = (await page.locator(".scene").boundingBox())!;
    expect([b.x, b.y, b.width, b.height]).toEqual([0, 0, 1280, 720]);
    await expect(page.locator(".scene-title")).toBeInViewport({ ratio: 1 });
  });

  test("Live fills the canvas too", async ({ page }) => {
    await page.goto(
      `/o/live${hash({ layouts: { landscape: { size: { width: 1280, height: 720 } } } })}`,
    );
    const b = (await page.locator(".live").boundingBox())!;
    expect([b.width, b.height]).toEqual([1280, 720]);
    const chat = (await page.locator(".layout-el-chat").boundingBox())!;
    expect(chat.x + chat.width).toBeLessThanOrEqual(1280);
  });
});

test.describe("in the editor", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("another size moves the layout over, and switching back gives it back", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    await page.getByRole("button", { name: "Customize" }).click();
    await expect(page.getByRole("region", { name: "Layers" })).toBeVisible();
    const before = (await linkSettings(page))!.scenes.starting!;

    const size = page.getByRole("combobox", { name: "Canvas size" });
    await size.selectOption({ label: "Another size…" });
    await page.getByRole("spinbutton", { name: "Canvas width" }).fill("1080");
    await page.getByRole("spinbutton", { name: "Canvas height" }).fill("1920");
    await page.getByRole("button", { name: "Use this size" }).click();
    await expect(size).toHaveValue("custom");
    const tall = (await linkSettings(page))!;
    expect(tall.size).toEqual({ width: 1080, height: 1920 });
    const title = (els: typeof before) => els.find((e) => e.type === "title")!;
    // The title keeps its size and its place, proportionally, on the taller box (1920×3413).
    expect(title(tall.scenes.starting!).w).toBe(title(before).w);
    const middle = (e: { y: number; h: number }, h: number) => (e.y + e.h / 2) / h;
    expect(middle(title(tall.scenes.starting!), 3413)).toBeCloseTo(middle(title(before), 1080), 2);
    const canvas = (await page.locator(".canvas").boundingBox())!;
    expect(canvas.height).toBeGreaterThan(canvas.width);

    await size.selectOption({ label: "1920 × 1080" });
    const back = (await linkSettings(page))!;
    expect(back.scenes.starting).toEqual(before);
  });

  test("the links give OBS the size, and a bad size is explained", async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    const size = page.getByRole("combobox", { name: "Canvas size" });
    await size.selectOption({ label: "1280 × 720" });
    const row = page.locator(".editor-link", {
      has: page.getByText("Starting Soon", { exact: true }),
    });
    await expect(row).toContainText("1280");
    await expect(row).toContainText("720");

    await size.selectOption({ label: "Another size…" });
    await page.getByRole("spinbutton", { name: "Canvas width" }).fill("3840");
    await page.getByRole("spinbutton", { name: "Canvas height" }).fill("400");
    await expect(page.getByText("at most three times as wide as tall")).toBeVisible();
    await page.getByRole("button", { name: "Use this size" }).click();
    expect((await linkSettings(page))!.size).toEqual({ width: 1280, height: 720 });
  });
});
