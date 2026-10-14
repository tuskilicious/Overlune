import { expect, test } from "@playwright/test";

// Light and dark mode for the site (2.1): follows the system until the streamer picks, then remembers the pick in this
// browser. Overlays never take it: they're in their look's own colors.

const html = (page: import("@playwright/test").Page) => page.locator("html");

test("follows the system's setting until a pick is made", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/guide");
  await expect(html(page)).toHaveAttribute("data-site-theme", "light");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html(page)).toHaveAttribute("data-site-theme", "dark");
});

test("the nav's toggle switches the mode, and the pick is kept", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  const nav = page.getByRole("navigation", { name: "Main" });
  await nav.getByRole("button", { name: "Switch to light mode" }).click();
  await expect(html(page)).toHaveAttribute("data-site-theme", "light");
  // The page and its text change with it.
  const bg = () => page.locator(".landing").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(await bg()).toBe("rgb(246, 244, 253)");
  await page.reload();
  await expect(html(page)).toHaveAttribute("data-site-theme", "light");
  // The system changing no longer overrides a pick.
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(html(page)).toHaveAttribute("data-site-theme", "light");
  await nav.getByRole("button", { name: "Switch to dark mode" }).click();
  await expect(html(page)).toHaveAttribute("data-site-theme", "dark");
  expect(await bg()).toBe("rgb(5, 6, 26)");
});

test("the editor's chrome follows, and the hero stays night", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("overlune-site-theme", "light"));
  await page.goto("/editor");
  const bg = await page
    .locator(".editor")
    .first()
    .evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(bg).toBe("rgb(246, 244, 253)");
  await page.goto("/");
  const card = await page
    .locator(".landing-hero-card")
    .evaluate((el) => getComputedStyle(el).color);
  expect(card).toBe("rgb(244, 241, 255)");
});

test("overlays never take the site's mode", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("overlune-site-theme", "light"));
  await page.goto("/o/starting");
  await expect(html(page)).not.toHaveAttribute("data-site-theme");
});
