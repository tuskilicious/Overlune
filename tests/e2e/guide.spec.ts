import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the editor links to the setup guide and back", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clean Slate" }).click(); // first-visit gallery (T6.16)
  await page.getByRole("link", { name: "step-by-step setup guide" }).click();
  await expect(page).toHaveURL(/\/guide$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Set up your overlays in OBS");

  await page.getByRole("link", { name: "Back to the editor" }).click();
  await expect(page.getByRole("heading", { name: "Links to paste into OBS" })).toBeVisible();
});

test("the guide heading doesn't overlap the line under it", async ({ page }) => {
  await page.goto("/guide");
  const h1 = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
  const intro = (await page.getByText("About 5 minutes.").boundingBox())!;
  expect(h1.height).toBeGreaterThan(0);
  expect(intro.y).toBeGreaterThanOrEqual(h1.y + h1.height);
});

test("the guide has the Overlune logo linking back to the editor (T6.25)", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("link", { name: "Overlune editor" })).toHaveAttribute("href", "/");
  await expect(page.locator(".guide-step")).toHaveCount(3);
});

test("the guide covers every fix beginners need", async ({ page }) => {
  await page.goto("/guide");
  for (const name of [
    "1. Add an overlay",
    "2. Tick the right boxes",
    "3. Make sure alerts can be heard",
    "Fix: a black or white box",
    "Fix: chat is empty",
    "Using Streamlabs Desktop?",
  ])
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
});

test("the size table matches the editor's links", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Clean Slate" }).click(); // first-visit gallery (T6.16)
  const editorSizes = await page.locator("#obs-links .editor-link label > span").allInnerTexts();

  await page.goto("/guide");
  const rows = page.getByRole("table", { name: "Sizes to type in" }).locator("tbody tr");
  await expect(rows).toHaveCount(editorSizes.length);
  for (const [i, text] of editorSizes.entries()) {
    const [, name, width, height] = /^(.+) · Width (\d+) · Height (\d+)$/.exec(text)!;
    await expect(rows.nth(i)).toContainText(`${name}${width}${height}`);
  }
});

test("the guide has no axe accessibility violations", async ({ page }) => {
  await page.goto("/guide");
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

test("every guide screenshot loads", async ({ page }) => {
  await page.goto("/guide");
  const shots = page.locator(".guide-shot img");
  await expect(shots).toHaveCount(4);
  for (const img of await shots.all()) {
    await img.scrollIntoViewIfNeeded(); // they load lazily
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
});
