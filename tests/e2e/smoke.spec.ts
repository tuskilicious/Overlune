import { expect, test } from "@playwright/test";
import lz from "lz-string";

const link = (data: unknown) =>
  `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`;

test("editor placeholder renders", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Overlune" })).toBeVisible();
});

test("starting soon overlay renders", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("a valid link shows no error card", async ({ page }) => {
  await page.goto(link({ starting: { title: "Back in a bit" } }));
  await expect(page.getByRole("heading", { name: "Back in a bit" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

for (const hash of ["#1.garbage", "#9.abc"]) {
  test(`a damaged link (${hash}) shows the error card over the defaults`, async ({ page }) => {
    await page.goto(`/o/starting${hash}`);
    await expect(page.getByRole("status")).toContainText("This overlay link has a problem");
    await expect(page.getByRole("status")).toContainText("Some settings couldn’t be read");
    await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  });
}

test("one bad field shows the error card but keeps the rest", async ({ page }) => {
  await page.goto(link({ logo: "javascript:alert(1)", starting: { title: "Back in a bit" } }));
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Back in a bit" })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});
