import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

const preview = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Preview" });

test("the editor shows Starting Soon in the preview by default", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Overlune" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Clean Slate" })).toBeChecked();
  await expect(
    preview(page).getByRole("heading", { name: "Starting soon", exact: true }),
  ).toBeVisible();
});

test("typing a title updates the preview of the chosen scene", async ({ page }) => {
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await expect(
    preview(page).getByRole("heading", { name: "Be right back", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Grabbing snacks");
  await expect(
    preview(page).getByRole("heading", { name: "Grabbing snacks", exact: true }),
  ).toBeVisible();

  await page.getByRole("radio", { name: "Stream Ending" }).check();
  await expect(
    preview(page).getByRole("heading", { name: "Thanks for watching!", exact: true }),
  ).toBeVisible();
});

test("socials can be added and removed", async ({ page }) => {
  await page.getByRole("button", { name: "Add a social" }).click();
  await page.getByLabel("Site").selectOption("youtube");
  await page.getByLabel("Name or handle").fill("mychannel");
  await expect(preview(page).getByText("YouTube mychannel")).toBeVisible();
  await page.getByRole("button", { name: "Remove YouTube mychannel" }).click();
  await expect(preview(page).getByRole("list")).toHaveCount(0);
});

test("only https: logo links reach the preview", async ({ page }) => {
  const logo = page.getByLabel("Link to your logo image");
  await logo.fill("javascript:alert(1)");
  await expect(page.getByRole("alert")).toHaveText("This link must start with https://");
  await expect(preview(page).locator("img")).toHaveCount(0);

  await logo.fill("https://example.com/logo.png");
  await expect(page.getByRole("alert")).toHaveText("");
  await expect(preview(page).locator("img")).toHaveAttribute("src", "https://example.com/logo.png");
});

test("the countdown time keeps its clock time when the time zone changes", async ({ page }) => {
  const endsAt = page.getByLabel("Countdown ends at");
  await endsAt.fill("2026-10-01T20:00");
  await page.getByLabel("Your time zone").selectOption("Asia/Tokyo");
  await expect(endsAt).toHaveValue("2026-10-01T20:00");
});

test("every control has a label", async ({ page }) => {
  await page.getByRole("button", { name: "Add a social" }).click();
  for (const el of await page.locator("input, select").all()) {
    expect(await el.evaluate((e) => (e as HTMLInputElement).labels?.length ?? 0)).toBeGreaterThan(
      0,
    );
  }
});

test("the preview runs the real overlay, countdown included", async ({ page }) => {
  await page.getByLabel("Your time zone").selectOption("UTC");
  const inAnHour = new Date(Date.now() + 3_600_000).toISOString().slice(0, 16);
  await page.getByLabel("Countdown ends at").fill(inAnHour);
  await expect(preview(page).locator(".countdown-time")).toHaveText(/^\d{2}:\d{2}$|^1:00:00$/);
  await expect(preview(page).getByText(/^Starts at .* UTC$/)).toBeVisible();
});

test("each overlay link shows the size to enter in OBS", async ({ page }) => {
  const rows = page.getByRole("region", { name: "Links to paste into OBS" }).getByRole("listitem");
  await expect(rows).toHaveCount(3);
  for (const row of await rows.all()) await expect(row).toContainText("Width 1920 · Height 1080");
});

test("a copied link opens the overlay with the editor's settings", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await page.getByLabel("Title", { exact: true }).fill("Grabbing snacks");

  await page.getByRole("button", { name: "Copy Be Right Back link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copied!" })).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/o\/brb#1\./);

  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Grabbing snacks" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});
