import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

for (const path of ["/", "/guide", "/nope"]) {
  test(`${path} has the footer with privacy, terms and contact`, async ({ page }) => {
    await page.goto(path);
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByRole("link", { name: "Privacy" })).toHaveAttribute("href", "/privacy");
    await expect(footer.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms");
    // T6.77: the open-source repo and a way to report a problem beyond email.
    await expect(footer.getByRole("link", { name: "Open source on GitHub" })).toHaveAttribute(
      "href",
      "https://github.com/tuskilicious/Overlune",
    );
    await expect(footer.getByRole("link", { name: "Report a problem" })).toHaveAttribute(
      "href",
      "https://github.com/tuskilicious/Overlune/issues/new",
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

for (const [path, title, line] of [
  ["/privacy", "Overlune Privacy Policy", "Overlune sets no cookies and uses no trackers"],
  ["/terms", "Overlune Terms of Use", "These terms are governed by the laws of"],
] as const) {
  test(`${path} shows the legal doc as a page in the site's style (T6.13)`, async ({ page }) => {
    await page.goto("/editor");
    await page.getByRole("button", { name: "Clean Slate" }).click();
    await page
      .getByRole("contentinfo")
      .getByRole("link", { name: path === "/privacy" ? "Privacy" : "Terms" })
      .click();
    await expect(page).toHaveURL(new RegExp(`${path}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(title);
    await expect(page.getByText("Self-written, not legal advice.")).toBeVisible();
    await expect(page.getByText(line)).toBeVisible();
    await expect(page.locator("main a").first()).toHaveAttribute("href", /^https:\/\//);
    await expect(page.getByRole("link", { name: "Overlune home" })).toHaveAttribute("href", "/");
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
}

test("an unknown address shows a not-found page with a way back (T6.51)", async ({ page }) => {
  await page.goto("/nope");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("This page doesn’t exist");
  await expect(page.getByRole("link", { name: "Overlune home" }).first()).toHaveAttribute(
    "href",
    "/",
  );
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
  await page.getByRole("link", { name: "Make your overlays" }).click();
  await expect(page).toHaveURL(/\/editor$/);
});
