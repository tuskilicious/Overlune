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
    // T6.80: optional support, on GitHub Sponsors.
    await expect(footer.getByRole("link", { name: "Support Overlune" })).toHaveAttribute(
      "href",
      "https://github.com/sponsors/tuskilicious",
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
  ["/privacy", "Overlune Privacy Policy", "Overlune uses no tracking cookies and no trackers"],
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

test("every page has the site's one nav, and none scrolls sideways on a phone (T8.1)", async ({
  page,
}) => {
  for (const [path, action] of [
    ["/", "Open the editor"],
    ["/guide", "Open the editor"],
    ["/privacy", "Open the editor"],
    ["/terms", "Open the editor"],
    ["/nope", "Open the editor"],
    ["/editor", null],
  ] as const) {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(path);
    const nav = page.getByRole("navigation", { name: "Main" });
    await expect(nav.getByRole("link", { name: "Overlune home" }), path).toHaveAttribute(
      "href",
      "/",
    );
    await expect(nav.getByRole("link", { name: "Setup guide" }), path).toBeVisible();
    if (action)
      await expect(nav.getByRole("link", { name: action }), path).toHaveAttribute(
        "href",
        "/editor",
      );
    // The narrowest window that shows the links: each stays on one line (T8.6 found two wrapping off the home page).
    await page.setViewportSize({ width: 768, height: 1024 });
    const wrapped = await nav
      .getByRole("listitem")
      .getByRole("link")
      .evaluateAll((links) =>
        links.filter((a) => a.getClientRects().length > 1).map((a) => a.textContent),
      );
    expect(wrapped, path).toEqual([]);
    await page.setViewportSize({ width: 390, height: 844 });
    // On failure, name what sticks out, since it can depend on the machine's fonts.
    const wide = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      out: [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > innerWidth)
        .map((el) => `${el.tagName}.${el.className} "${el.textContent!.slice(0, 40)}"`)
        .slice(-3),
    }));
    expect(wide.width, `${path}: ${wide.out.join(" | ")}`).toBeLessThanOrEqual(390);
  }
  // From another page, the nav's section links lead to that part of the home page.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/guide");
  await expect(
    page.getByRole("navigation", { name: "Main" }).getByRole("link", { name: "Setup guide" }),
  ).toHaveAttribute("aria-current", "page");
  await page
    .getByRole("navigation", { name: "Main" })
    .getByRole("link", { name: "How it works" })
    .click();
  await expect(page).toHaveURL(/\/#how$/);
  await expect(page.locator("#how")).toBeInViewport();
});

test("the legal pages index their own headings and mark the part you're reading (T8.3)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/terms");
  const index = page.getByRole("navigation", { name: "On this page" });
  // Built from docs/legal/terms.md, so it lists exactly its sections.
  await expect(index.getByRole("link")).toHaveCount(await page.locator("main.legal h2").count());
  await expect(index.getByRole("link", { name: "1. What Overlune is" })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await index.getByRole("link", { name: "3. Accounts" }).click();
  await expect(page).toHaveURL(/\/terms#3-accounts$/);
  await expect(index.getByRole("link", { name: "3. Accounts" })).toHaveAttribute(
    "aria-current",
    "location",
  );
  await expect(index).toBeInViewport();
  // Phones skip it: fourteen chips would push the text off the first screen.
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(index).toBeHidden();
});
