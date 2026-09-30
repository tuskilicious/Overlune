import { expect, test } from "@playwright/test";

test("editor placeholder renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overlune" })).toBeVisible();
});

test("overlay route renders", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.getByText("Overlay: starting")).toBeVisible();
});
