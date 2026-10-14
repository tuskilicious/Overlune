import { expect, test, type Page } from "@playwright/test";

// The editor's Horizontal / Vertical switch (T10.4).

type Layout = { size: { width: number; height: number }; scenes: Record<string, unknown[]> };

/** The editor's link, decoded by the editor's own decoder. */
const layouts = (page: Page) =>
  page.evaluate(() =>
    import("/src/settings/url.ts" as string).then(
      (m: {
        decode: (h: string) => {
          settings: { layouts: { landscape?: Layout; portrait?: Layout } };
        };
      }) => m.decode(location.hash.slice(1)).settings.layouts,
    ),
  );

const axe = async (page: Page) => {
  const { default: AxeBuilder } = await import("@axe-core/playwright");
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
};

const open = async (page: Page) => {
  await page.goto("/editor");
  await page.getByRole("button", { name: "Clean Slate" }).click();
};

test.describe("wide", () => {
  test.use({ viewport: { width: 1440, height: 1000 } });

  test("old bookmarks open horizontal, with the usual links", async ({ page }) => {
    await open(page);
    const pick = page.getByRole("group", { name: "Canvas shape" });
    await expect(pick.getByRole("button", { name: "Horizontal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.locator(".editor-link input").first()).not.toHaveValue(/canvas=vertical/);
    await expect(page.locator(".safe-zone")).toHaveCount(0);
  });

  test("Vertical waits for a look's portrait art on its scenes, and says so", async ({ page }) => {
    await open(page);
    const vertical = page.getByRole("button", { name: "Vertical" });
    await expect(vertical).toBeDisabled();
    await page.getByRole("button", { name: "Live source" }).click();
    await vertical.click();
    await expect(vertical).toHaveAttribute("aria-pressed", "true");
    // Back to Starting Soon: horizontal again, with the reason.
    await page.getByRole("button", { name: "Live source" }).click();
    await expect(page.getByText("comes in vertical in a later update")).toBeVisible();
    await expect(page.getByRole("button", { name: "Horizontal" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  test("Vertical: a 9:16 preview with the safe zone, portrait sizes and vertical links", async ({
    page,
  }) => {
    await open(page);
    await page.getByRole("button", { name: "Live source" }).click();
    await page.getByRole("button", { name: "Vertical" }).click();
    const preview = (await page.locator(".editor-scene-preview .editor-preview").boundingBox())!;
    expect(preview.height / preview.width).toBeCloseTo(16 / 9, 1);
    await expect(page.locator(".editor-scene-preview .safe-zone")).toBeVisible();
    await expect(page.getByRole("combobox", { name: "Canvas size" })).toHaveValue("1080x1920");

    const links = page.locator(".editor-link");
    await expect(links.filter({ hasText: "Live" }).locator("input")).toHaveValue(
      /\/o\/live\?canvas=vertical#1\./,
    );
    await expect(links.filter({ hasText: "Just Chatting" })).toContainText("1080");
    await expect(links.filter({ hasText: "Starting Soon" })).toHaveCount(0);
    await expect(page.getByText("Download OBS scene collection")).toHaveCount(0);
    await axe(page);
  });

  test("Customize edits each canvas's own layout", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Live source" }).click();
    await page.getByRole("button", { name: "Customize" }).click();
    await page.getByRole("button", { name: "Done" }).click();
    await page.getByRole("button", { name: "Vertical" }).click();
    await page.getByRole("button", { name: "Customize" }).click();
    await expect(page.locator(".canvas .safe-zone")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    const saved = await layouts(page);
    expect(saved.landscape!.scenes.live).toBeTruthy();
    expect(saved.portrait!.scenes.live).toBeTruthy();
    expect(saved.portrait!.scenes.live).not.toEqual(saved.landscape!.scenes.live);
    expect(saved.landscape!.size).toEqual({ width: 1920, height: 1080 });
  });
});

test.describe("narrow", () => {
  test.use({ viewport: { width: 700, height: 900 } });

  test("the switch stays accessible", async ({ page }) => {
    await open(page);
    await page.getByRole("button", { name: "Show preview" }).click();
    await page.getByRole("button", { name: "Live source" }).click();
    const vertical = page.getByRole("button", { name: "Vertical" });
    await vertical.click();
    await expect(page.locator(".editor-scene-preview .safe-zone")).toBeVisible();
    // Scanned once the pressed fill has faded in: Night on Lune Violet.
    await page.mouse.move(0, 0);
    await expect(vertical).toHaveCSS("color", "rgb(5, 6, 26)");
    await axe(page);
  });
});
