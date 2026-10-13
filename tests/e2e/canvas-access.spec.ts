import { expect, test, type Page } from "@playwright/test";

// Beginners and access (T9.9): the canvas by keyboard alone, and the guide's part on customizing.

test.use({ viewport: { width: 1440, height: 1000 } });

/** The starting scene's layout as the editor's link holds it now. */
const layout = (page: Page) =>
  page.evaluate(() =>
    import("/src/settings/url.ts" as string).then(
      (m: {
        decode: (h: string) => {
          settings: {
            layouts: {
              landscape?: {
                scenes: { starting?: { id: string; x: number; y: number; w: number; h: number }[] };
              };
            };
          };
        };
      }) => m.decode(location.hash.slice(1)).settings.layouts.landscape?.scenes.starting ?? [],
    ),
  );

test("keyboard only: pick a look, Customize, move and resize a part, then Done", async ({
  page,
}) => {
  await page.goto("/editor");
  // The pick-a-look path stays first.
  await expect(page.getByRole("heading", { name: "Pick a look to start" })).toBeVisible();
  await page.getByRole("button", { name: "Clean Slate" }).focus();
  await page.keyboard.press("Enter");

  await page.getByRole("button", { name: "Customize" }).focus();
  await page.keyboard.press("Enter");
  const canvas = page.locator(".canvas");
  await expect(canvas).toBeFocused(); // focus follows into the canvas
  const status = page.locator("#canvas-status");
  await expect(status).toHaveText("Nothing selected.");
  // Read by screen readers, never shown.
  expect((await status.boundingBox())!.width).toBeLessThanOrEqual(1);

  await page.keyboard.press("Tab");
  await expect(status).toContainText("selected, at");
  const [first] = await layout(page);
  await page.keyboard.press("Shift+ArrowRight");
  await page.keyboard.press("Alt+ArrowDown");
  const [moved] = await layout(page);
  expect(moved).toMatchObject({ id: first!.id, x: first!.x + 10, h: first!.h + 1 });
  await expect(status).toContainText(`at ${first!.x + 10}, ${first!.y}`);
  await page.keyboard.press("Escape");
  await expect(status).toHaveText("Nothing selected.");

  // The keys are listed for people who don't use a screen reader.
  await page.getByText("Keyboard keys").focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".canvas-keys")).toContainText("Send it down or bring it up a layer");

  await page.getByRole("button", { name: "Done" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Customize" })).toBeFocused(); // never lost to the top
});

test("Reset to the look keeps focus by the preview too", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Clean Slate" }).click();
  await page.getByRole("button", { name: "Customize" }).click();
  await page.getByRole("button", { name: "Reset to the look" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("button", { name: "Customize" })).toBeFocused();
});

test("the guide explains customizing, with the canvas keys", async ({ page }) => {
  await page.goto("/guide");
  const part = page.getByRole("region", { name: "Make it yours: move things around" });
  await expect(part).toContainText("press Customize");
  await expect(part.getByRole("table", { name: "Keyboard keys on the canvas" })).toContainText(
    "Alt + arrow keys",
  );
  await expect(page.getByRole("navigation", { name: "On this page" })).toContainText(
    "Move things around",
  );
  // The step numbers are for screen readers; the rail shows them.
  const number = page.locator(".guide-step h2 .sr-only").first();
  expect((await number.boundingBox())!.width).toBeLessThanOrEqual(1);
});
