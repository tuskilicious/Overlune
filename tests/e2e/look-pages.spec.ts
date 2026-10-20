import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { themeIds } from "../../src/themes/types";

// T15.3: a page per look, and its button opens the editor with that look picked.
test("a look's page shows the look and opens the editor with it picked", async ({ page }) => {
  await page.goto("/looks/rain-city");
  await expect(page).toHaveTitle("Rain City: a free stream overlay for OBS · Overlune");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Rain City");
  await expect(page.getByText("A crescent sign over a wet street, last train home.")).toBeVisible();
  await expect(
    page.getByAltText("Rain City's Starting Soon scene", { exact: false }),
  ).toHaveAttribute("src", "/images/looks/rain-city.jpg");
  await expect(page.getByAltText("The same scene on the vertical canvas.")).toHaveAttribute(
    "src",
    "/images/looks/rain-city-vertical.jpg",
  );
  await expect(page.getByRole("link", { name: "Eclipse" })).toHaveAttribute(
    "href",
    "/looks/eclipse",
  );
  await expect(page.getByRole("link", { name: "Paper Cut" })).toHaveAttribute(
    "href",
    "/looks/paper-cut",
  );
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  await page.getByRole("link", { name: "Use Rain City" }).click();
  await expect(page.getByRole("radio", { name: "Rain City" })).toBeChecked();
  // Picked once: the address no longer asks for it, so a reload keeps a later choice.
  await expect(page).toHaveURL(/\/editor#1\./);
  await page.getByRole("radio", { name: "Sakura" }).check();
  await page.reload();
  await expect(page.getByRole("radio", { name: "Sakura" })).toBeChecked();
});

test("every look in the registry has its own page and button", async ({ page }) => {
  const titles = new Set<string>();
  for (const id of themeIds) {
    await page.goto(`/looks/${id}`);
    const name = await page.getByRole("heading", { level: 1 }).textContent();
    await expect(page.getByRole("link", { name: `Use ${name}` })).toHaveAttribute(
      "href",
      `/editor?look=${id}`,
    );
    titles.add(await page.title());
  }
  expect(titles.size).toBe(themeIds.length);
});

test("a saved overlay keeps its text when a look's page picks a new look", async ({ page }) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Neon Grid", exact: true }).click();
  await page.getByLabel("Title").first().fill("Back in five");
  await page.goto("/editor?look=quest");
  await expect(page.getByRole("radio", { name: "Quest" })).toBeChecked();
  await expect(page.getByLabel("Title").first()).toHaveValue("Back in five");
});

test("pages opened by a link start at the top; a link to a part of a page goes there", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const row = page.locator('[data-look-row="quest"] .landing-look-row');
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Quest");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("link", { name: "Eclipse" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Eclipse");
  await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
  await page.getByRole("link", { name: "All 20 looks" }).click();
  await expect(page.locator("#looks")).toBeInViewport();
});

test("a look that doesn't exist gets the not-found page", async ({ page }) => {
  await page.goto("/looks/no-such-look");
  await expect(page.getByRole("heading", { name: "This page doesn’t exist" })).toBeVisible();
  await page.goto("/editor?look=no-such-look");
  await expect(page.getByRole("heading", { name: "Pick a look to start" })).toBeVisible();
});
