import { expect, test } from "@playwright/test";
import lz from "lz-string";
// A frozen real v1 link. Never regenerate it: it stands in for links already pasted into OBS.
import fixture from "../fixtures/links/v1/starting.json" with { type: "json" };

// Playwright runs specs in Node; the project has no @types/node, so declare the one field used.
declare const process: { platform: string };

// Font rendering differs between Windows and Linux, so the baseline is Linux-only (CI).
// To update it, see "Updating screenshot baselines" in the README.
test.skip(process.platform !== "linux", "screenshot baselines are made on Linux in CI");

test("Starting Soon matches the baseline", async ({ page }) => {
  const payload = fixture.link.slice(fixture.link.indexOf("#1.") + 3);
  const endsAt: number = JSON.parse(lz.decompressFromEncodedURIComponent(payload)).starting.endsAt;

  await page.clock.setFixedTime(endsAt - (12 * 60 + 34) * 1000); // countdown shows 12:34
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto(fixture.link);
  await expect(page.getByText("12:34")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  await expect(page).toHaveScreenshot("starting.png");
});
