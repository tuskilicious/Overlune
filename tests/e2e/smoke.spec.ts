import { expect, test } from "@playwright/test";
import lz from "lz-string";

const link = (data: unknown) =>
  `/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`;

test("starting soon overlay renders", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("socials with no name are left off the scene (T6.27)", async ({ page }) => {
  await page.goto(
    link({
      socials: [
        { platform: "twitch", handle: "" },
        { platform: "youtube", handle: "   " },
        { platform: "x", handle: "somestreamer" },
      ],
    }),
  );
  await expect(page.locator(".scene-socials li")).toHaveText(["X somestreamer"]);
  await page.goto(link({ socials: [{ platform: "twitch", handle: "" }] }));
  await expect(page.getByRole("heading", { name: "Starting soon" })).toBeVisible();
  await expect(page.locator(".scene-socials")).toHaveCount(0);
});

test("redesigned themes show socials as platform icons; classic themes as words (T6.35)", async ({
  page,
}) => {
  const socials = [{ platform: "twitch", handle: "tusk" }];
  await page.goto(link({ socials }));
  await expect(page.locator(".scene")).toHaveAttribute("data-layout", "broadcast");
  await expect(page.locator(".scene-socials .scene-icon")).toBeVisible();
  await expect(page.locator(".scene-socials .scene-platform")).toHaveText("Twitch"); // kept for screen readers
  await page.goto(link({ theme: "vaporwave-sunset", socials }));
  await expect(page.locator(".scene")).toHaveAttribute("data-layout", "classic");
  await expect(page.locator(".scene-socials .scene-icon")).toBeHidden();
  await expect(page.locator(".scene-socials .scene-platform")).toBeVisible();
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

const entranceAnimation = (page: import("@playwright/test").Page) =>
  page.locator(".scene-main").evaluate((el) => getComputedStyle(el).animationName);

test("the entrance animates by default", async ({ page }) => {
  await page.goto("/o/starting");
  expect(await entranceAnimation(page)).toBe("scene-slide-fade");
});

test("?rm=1 turns animations off", async ({ page }) => {
  await page.goto("/o/starting?rm=1");
  expect(await entranceAnimation(page)).toBe("none");
});

test("the OS reduced-motion setting turns animations off", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/o/starting");
  expect(await entranceAnimation(page)).toBe("none");
});

test("one bad field shows the error card but keeps the rest", async ({ page }) => {
  await page.goto(link({ logo: "javascript:alert(1)", starting: { title: "Back in a bit" } }));
  await expect(page.getByRole("status")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Back in a bit" })).toBeVisible();
  await expect(page.locator("img")).toHaveCount(0);
});

for (const [route, heading] of [
  ["brb", "Be right back"],
  ["ending", "Thanks for watching!"],
] as const) {
  test(`${route} overlay renders its default title`, async ({ page }) => {
    await page.goto(`/o/${route}`);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("status")).toHaveCount(0);
  });

  test(`${route} overlay shows the error card for a damaged link`, async ({ page }) => {
    await page.goto(`/o/${route}#1.garbage`);
    await expect(page.getByRole("status")).toContainText("This overlay link has a problem");
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  });
}
