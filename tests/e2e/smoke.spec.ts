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

test("socials show as platform icons, with the platform word kept (T6.35)", async ({ page }) => {
  const socials = [{ platform: "twitch", handle: "tusk" }];
  await page.goto(link({ socials }));
  await expect(page.locator(".scene-socials .scene-icon")).toBeVisible();
  await expect(page.locator(".scene-socials .scene-platform")).toHaveText("Twitch"); // kept for screen readers
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
  page
    .locator(".scene-word")
    .first()
    .evaluate((el) => getComputedStyle(el).animationName);

test("the entrance animates by default, word by word (T6.117)", async ({ page }) => {
  await page.goto("/o/starting");
  expect(await entranceAnimation(page)).toBe("scene-slide-fade");
  // Each word waits its turn.
  const delays = await page
    .locator(".scene-word")
    .evaluateAll((els) => els.map((el) => getComputedStyle(el).animationDelay));
  expect(delays).toEqual(["0.16s", "0.25s"]);
});

test("only the countdown digits that change flip in (T6.117)", async ({ page }) => {
  // Paused, so time only moves when the test says so.
  await page.clock.install({ time: new Date("2026-10-02T11:59:00Z") });
  await page.clock.pauseAt(new Date("2026-10-02T12:00:00Z"));
  const data = { starting: { endsAt: new Date("2026-10-02T12:10:05Z").getTime() } };
  await page.goto(`/o/starting#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`);
  await expect(page.locator(".countdown-time")).toHaveText("10:05");
  const first = await page.locator(".countdown-ch").elementHandles();
  await page.clock.runFor(1000);
  await expect(page.locator(".countdown-time")).toHaveText("10:04");
  const after = await page.locator(".countdown-ch").elementHandles();
  // "1", "0", ":" and "0" are the same elements; only the last digit was replaced.
  const same = await Promise.all(after.map((h, i) => h.evaluate((a, b) => a === b, first[i])));
  expect(same).toEqual([true, true, true, true, false]);
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

// T6.68: each page has its own tab title and canonical address on overlune.in; overlays have no canonical.
for (const [path, title] of [
  ["/", "Overlune: free stream overlays for OBS"],
  ["/editor", "Make your overlays · Overlune"],
  ["/guide", "Set up your overlays in OBS · Overlune"],
  ["/privacy", "Privacy · Overlune"],
  ["/nope", "Page not found · Overlune"],
] as const) {
  test(`${path} has its own title and canonical address`, async ({ page }) => {
    await page.goto(path);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      `https://overlune.in${path}`,
    );
  });
}

test("overlays have no canonical address", async ({ page }) => {
  await page.goto("/o/starting");
  await expect(page.locator(".scene")).toBeVisible();
  await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
});
