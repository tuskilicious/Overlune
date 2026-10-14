import { expect, test } from "@playwright/test";

// Star on GitHub in the nav (2.1): on every page, named for screen readers even where only the star shows.

for (const path of ["/", "/editor", "/guide"])
  test(`the nav links to the repo to star it on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole("link", { name: "Star Overlune on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/tuskilicious/Overlune",
    );
  });

test.describe("in a narrower window", () => {
  test.use({ viewport: { width: 900, height: 800 } });

  test("only the star shows, at the toggle's size", async ({ page }) => {
    await page.goto("/");
    const star = page.getByRole("link", { name: "Star Overlune on GitHub" });
    await expect(star.getByText("Star on GitHub")).toBeHidden();
    expect((await star.boundingBox())!.height).toBe(40);
  });
});

test.describe("on a phone", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("the bar leaves it out; the footer's GitHub link stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("link", { name: "Star Overlune on GitHub" })).toBeHidden();
    await expect(page.getByRole("link", { name: "Open source on GitHub" })).toBeAttached();
  });
});
