import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("the editor links to the setup guide and back", async ({ page }) => {
  await page.goto("/editor");
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
  const intro = (await page.getByText("You only do this once.").boundingBox())!;
  expect(h1.height).toBeGreaterThan(0);
  expect(intro.y).toBeGreaterThanOrEqual(h1.y + h1.height);
});

test("the guide has the Overlune logo linking back to the editor (T6.25)", async ({ page }) => {
  await page.goto("/guide");
  await expect(page.getByRole("link", { name: "Overlune home" })).toHaveAttribute("href", "/");
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
  await page.goto("/editor");
  await page.getByRole("button", { name: "Clean Slate" }).click(); // first-visit gallery (T6.16)
  // Text content, as screen readers get it: the sizes show as chips, with the dots kept but hidden (T6.60).
  const editorSizes = await page.locator("#obs-links .editor-link label > span").allTextContents();

  await page.goto("/guide");
  const rows = page.getByRole("table", { name: "Sizes to type in" }).locator("tbody tr");
  await expect(rows).toHaveCount(editorSizes.length);
  for (const [i, text] of editorSizes.entries()) {
    const [, name, width, height] = /^(.+) · Width (\d+) · Height (\d+)$/.exec(text)!;
    // The guide says "optional" in its note column instead (the webcam frame, T6.88).
    await expect(rows.nth(i)).toContainText(`${name?.replace(" (optional)", "")}${width}${height}`);
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
  // One sits in a fix, which opens in place (T6.153).
  await page.getByRole("heading", { name: "Fix: a black or white box" }).click();
  const shots = page.locator(".guide-shot img");
  await expect(shots).toHaveCount(4);
  for (const img of await shots.all()) {
    await img.scrollIntoViewIfNeeded(); // they load lazily
    await expect(img).toHaveJSProperty("complete", true);
    expect(await img.evaluate((el: HTMLImageElement) => el.naturalWidth)).toBeGreaterThan(0);
  }
});

test("the guide covers silent alerts and wrong sizes (T6.72)", async ({ page }) => {
  await page.goto("/guide");
  await expect(
    page.getByRole("heading", { name: "Fix: alerts are silent or don’t show" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Fix: the overlay is the wrong size or cut off" }),
  ).toBeVisible();
  // The fixes open in place (T6.153): the heading shows, the steps once it's opened.
  await expect(page.getByText("Transform → Fit to screen")).toBeHidden();
  await page
    .getByRole("heading", { name: "Fix: the overlay is the wrong size or cut off" })
    .click();
  await expect(page.getByText("Transform → Fit to screen")).toBeVisible();
});

// T6.153, after 21st.dev's "Vertical Titled Stepper": the steps sit on a rail you tick off as you go.
test("the setup steps can be ticked off, and the next one becomes current (T6.153)", async ({
  page,
}) => {
  await page.goto("/guide");
  const steps = page.locator(".guide-rail-item");
  const done = page.getByRole("button", { name: "Done with this step" });
  await expect(steps).toHaveCount(3);
  await expect(steps.first()).toHaveAttribute("data-current", "true");
  await done.first().click();
  await expect(done.first()).toHaveAttribute("aria-pressed", "true");
  await expect(steps.first()).toHaveAttribute("data-done", "true");
  await expect(steps.nth(1)).toHaveAttribute("data-current", "true");
  await done.first().click(); // and untick
  await expect(steps.first()).toHaveAttribute("data-current", "true");
  // Keyboard: a fix opens with Enter on its heading's row.
  await page.getByRole("heading", { name: "Fix: chat is empty" }).click();
  await expect(page.getByText("Nothing has been said yet.")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
});
