import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

// On a phone (2.1): Overlune says it's made for a computer, offers to send the link there, and says the Android app is
// coming. Closed once, it stays closed.

const card = (page: import("@playwright/test").Page) =>
  page.getByRole("complementary", { name: "Overlune is made for your computer" });

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("the home page and the editor say to open Overlune on a computer", async ({ page }) => {
    await page.goto("/");
    await expect(card(page)).toBeVisible();
    await expect(card(page)).toContainText("Open Overlune on your computer");
    await expect(card(page)).toContainText("Overlune app for Android is coming soon");
    await page.goto("/editor");
    await expect(card(page)).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .include(".phone-notice")
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });

  test("Got it closes it for good", async ({ page }) => {
    await page.goto("/guide");
    await card(page).getByRole("button", { name: "Got it" }).click();
    await expect(card(page)).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  });

  test("Send me the link shares or copies the editor's link", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/");
    // No share sheet in a test browser: the link is copied instead.
    await page.evaluate(() => Object.defineProperty(navigator, "share", { value: undefined }));
    await card(page).getByRole("button", { name: "Send me the link" }).click();
    await expect(card(page).getByRole("status")).toHaveText(
      "Link copied. Paste it into a message to yourself.",
    );
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/editor$/);
  });

  test("overlays never show it", async ({ page }) => {
    await page.goto("/o/starting");
    await expect(page.locator(".scene")).toBeVisible();
    await expect(page.locator(".phone-notice")).toHaveCount(0);
  });
});

test("a computer never sees it, even in a narrow window", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "Main" })).toBeVisible();
  await expect(page.locator(".phone-notice")).toHaveCount(0);
});
