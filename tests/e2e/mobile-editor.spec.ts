import { expect, test } from "@playwright/test";

// The editor on a phone (2.1): the preview dock stays on the screen, link rows keep their names whole, the Motion
// choice keeps its own one-row track, and nothing stays stuck in a hover state after a tap.

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("overlune-phone-notice", "closed"));
  await page.goto("/editor");
  await page.getByRole("button", { name: "Neon Grid" }).tap();
});

test("the preview dock never runs off the screen, even with the canvas and its panels", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Show preview" }).tap();
  await page.getByRole("button", { name: "Customize" }).tap();
  await page.getByRole("button", { name: "Shape" }).tap();
  const dock = (await page.locator(".editor-scene-preview").boundingBox())!;
  expect(dock.y).toBeGreaterThanOrEqual(80);
  expect(dock.y + dock.height).toBeLessThanOrEqual(845);
  // Its panels scroll inside it.
  const scrolls = await page
    .locator(".editor-scene-preview")
    .evaluate((d) => d.scrollHeight > d.clientHeight && getComputedStyle(d).overflowY === "auto");
  expect(scrolls).toBe(true);
});

test("a tapped button doesn't stay filled", async ({ page }) => {
  const undo = page.getByRole("button", { name: "Copy my save link" });
  await undo.tap();
  // The hover fill only exists where a pointer can hover, so a tap leaves it unfilled.
  const r = await undo.evaluate((b) => getComputedStyle(b).getPropertyValue("--ihb-r").trim());
  expect(r).toBe("0px");
});

test("link rows keep the name whole, with Copy link under the link", async ({ page }) => {
  const row = page.locator(".editor-link", {
    has: page.getByText("Webcam frame", { exact: true }),
  });
  await row.scrollIntoViewIfNeeded();
  const name = (await row.locator(".editor-link-name").boundingBox())!;
  const copy = (await row.getByRole("button", { name: /Copy/ }).boundingBox())!;
  expect(copy.y).toBeGreaterThan(name.y + name.height);
});

test("the Motion choice is one row with a full-height thumb", async ({ page }) => {
  const group = page.getByRole("radiogroup", { name: "How much moves" });
  await group.scrollIntoViewIfNeeded();
  const labels = await group
    .locator("label")
    .evaluateAll((ls) => ls.map((l) => Math.round(l.getBoundingClientRect().y)));
  expect(new Set(labels).size).toBe(1);
  const thumb = await group.evaluate((g) => {
    const a = getComputedStyle(g, "::after");
    return parseFloat(a.height) / g.getBoundingClientRect().height;
  });
  expect(thumb).toBeGreaterThan(0.8);
});
