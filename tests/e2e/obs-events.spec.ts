import { expect, test } from "@playwright/test";

// OBS's page events (the overlay playbook): a scene's entrance plays again when OBS puts its source on air; chat
// keeps its connection.

const goLive = (page: import("@playwright/test").Page) =>
  page.evaluate(() =>
    dispatchEvent(new CustomEvent("obsSourceActiveChanged", { detail: { active: true } })),
  );

test("a scene enters again when its source goes on air", async ({ page }) => {
  await page.goto("/o/brb");
  const title = page.locator(".scene-title");
  await expect(title).toBeVisible();
  await title.evaluate((el) => el.setAttribute("data-old", ""));
  await goLive(page);
  // A new element: the scene was drawn again, so its entrance ran again.
  await expect(page.locator(".scene-title:not([data-old])")).toBeVisible();
});

test("going off air does nothing, and chat is never redrawn", async ({ page }) => {
  await page.goto("/o/brb");
  await page.locator(".scene-title").evaluate((el) => el.setAttribute("data-old", ""));
  await page.evaluate(() =>
    dispatchEvent(new CustomEvent("obsSourceActiveChanged", { detail: { active: false } })),
  );
  await expect(page.locator(".scene-title[data-old]")).toBeVisible();

  await page.goto("/o/chat");
  await page.locator(".chat").evaluate((el) => el.setAttribute("data-old", ""));
  await goLive(page);
  await expect(page.locator(".chat[data-old]")).toBeAttached();
});
