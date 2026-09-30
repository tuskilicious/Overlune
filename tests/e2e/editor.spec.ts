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

test("an old link loads back into the editor", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await page.getByLabel("Title", { exact: true }).fill("Grabbing snacks");
  await page.getByLabel("Link to your logo image").fill("https://example.com/logo.png");
  await page.getByRole("button", { name: "Copy Be Right Back link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());

  await page.evaluate(() => localStorage.clear()); // a different browser, no autosave
  await page.goto("/");
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Be right back");

  await page.getByLabel("Load my overlay from a link").fill(link);
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Loaded!" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Grabbing snacks");
  await expect(page.getByLabel("Link to your logo image")).toHaveValue(
    "https://example.com/logo.png",
  );
  await expect(preview(page).getByRole("heading", { name: "Grabbing snacks" })).toBeVisible();
});

test("text that isn't an Overlune link changes nothing", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("My title");
  await page.getByLabel("Load my overlay from a link").fill("https://example.com/");
  await page.getByLabel("Load my overlay from a link").press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "doesn’t look like" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("My title");
});

test("a damaged link loads what it can and says so", async ({ page }) => {
  await page.getByLabel("Load my overlay from a link").fill("https://overlune.pages.dev/o/brb#1.x");
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "couldn’t be read" })).toBeVisible();
});

test("the editor's own address saves the work, so reload or a bookmark keeps it", async ({
  page,
}) => {
  await page.getByLabel("Title", { exact: true }).fill("Bookmarked title");
  await expect(page).toHaveURL(/\/#1\./);
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Bookmarked title");
  await expect(page.getByRole("status").filter({ hasText: "Loaded!" })).toBeVisible();
});

test("autosave restores the last overlay when the editor opens without a link", async ({
  page,
}) => {
  await page.getByLabel("Title", { exact: true }).fill("Autosaved title");
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Autosaved title");
  await expect(page.getByRole("status").filter({ hasText: "Welcome back!" })).toBeVisible();
});

test("a link in the address wins over the autosave", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("From the link");
  const link = page.url();
  await page.getByLabel("Title", { exact: true }).fill("Autosaved later");
  await page.goto("about:blank");
  await page.goto(link);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("From the link");
});

test("the editor still works when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });
  await page.goto("/");
  await page.getByLabel("Title", { exact: true }).fill("Still works");
  await expect(preview(page).getByRole("heading", { name: "Still works" })).toBeVisible();
});

test("start over asks first, then resets to the defaults", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("Old title");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Old title");

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Yes, start over" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Starting soon");
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Starting soon");
});

test("Advanced starts closed, and overrides reach the preview and the OBS link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const titleColor = page.getByLabel("Titles");
  await expect(titleColor).toBeHidden();
  await page.getByText("Advanced: colors and fonts").click();
  await expect(titleColor).toHaveValue("#e8eaed");

  await titleColor.fill("#ff2bd6");
  await page.getByLabel("Heading font").selectOption("Orbitron");
  const title = preview(page).getByRole("heading", { name: "Starting soon", exact: true });
  await expect(title).toHaveCSS("color", "rgb(255, 43, 214)");
  await expect(title).toHaveCSS("font-family", /^"?Orbitron/);

  await page.getByRole("button", { name: "Copy Starting Soon link" }).click();
  await page.goto(await page.evaluate(() => navigator.clipboard.readText()));
  await expect(page.getByRole("heading", { name: "Starting soon" })).toHaveCSS(
    "color",
    "rgb(255, 43, 214)",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("hard-to-read colors show a warning, and reset brings the theme back", async ({ page }) => {
  await page.getByText("Advanced: colors and fonts").click();
  const warning = page.getByRole("status").filter({ hasText: "hard to read" });
  await page.getByLabel("Text", { exact: true }).fill("#20232a");
  await expect(warning).toBeVisible();

  await page.getByRole("button", { name: "Reset Text to the theme" }).click();
  await expect(warning).toHaveCount(0);
  await expect(page.getByLabel("Text", { exact: true })).toHaveValue("#e8eaed");

  await page.getByLabel("Titles").fill("#00ff00");
  await page.getByRole("button", { name: "Reset all to the theme" }).click();
  await expect(page.getByLabel("Titles")).toHaveValue("#e8eaed");
  await expect(page.getByRole("button", { name: /^Reset (?!all).* to the theme$/ })).toHaveCount(0);
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
