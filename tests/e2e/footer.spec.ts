import { expect, test } from "@playwright/test";

for (const path of ["/", "/guide"]) {
  test(`${path} has the footer with privacy, terms and contact`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute(
      "href",
      /\/docs\/legal\/privacy\.md$/,
    );
    await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute(
      "href",
      /\/docs\/legal\/terms\.md$/,
    );
    await expect(footer.getByRole("link", { name: "support@overlune.in" })).toHaveAttribute(
      "href",
      "mailto:support@overlune.in",
    );
  });
}

test("overlays have no footer, since they are shown on stream", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.locator(".scene")).toBeVisible();
  await expect(page.getByRole("contentinfo")).toHaveCount(0);
});
