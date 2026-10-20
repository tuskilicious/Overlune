import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Sign in with Twitch in the editor (T7.4). The dev server has no API, so these answer /api for it, as the Pages
// Functions do (the Functions themselves are tested in tests/functions/).

const ME = {
  login: "moonstreamer",
  displayName: "MoonStreamer",
  avatarUrl: "https://static-cdn.jtvnw.net/user-default-pictures/a.png",
};
const json = (status: number, body: unknown) => ({
  status,
  contentType: "application/json; charset=utf-8",
  body: JSON.stringify(body),
});

/** Answers /api/me as signed in or out, and records the account requests the editor makes. */
async function api(page: Page, signedIn: boolean) {
  const calls: string[] = [];
  await page.route("**/api/**", (route) => {
    const req = route.request();
    const path = new URL(req.url()).pathname;
    calls.push(`${req.method()} ${path}`);
    if (path === "/api/me" && req.method() === "GET")
      return route.fulfill(signedIn ? json(200, ME) : { status: 204 });
    if (path === "/api/auth/twitch") return route.fulfill({ status: 200, body: "Twitch" });
    signedIn = false;
    return route.fulfill({ status: 204 });
  });
  // A Twitch picture, without going to Twitch.
  await page.route("https://static-cdn.jtvnw.net/**", (route) =>
    route.fulfill({ status: 200, contentType: "image/png", body: "" }),
  );
  return calls;
}

// The account sits in the site nav, where other pages have "Open the editor" (T8.1).
const header = (page: Page) => page.getByRole("navigation", { name: "Main" });

test("without the account API (as on `npm run dev`, or production before T7.9) the editor shows no account controls", async ({
  page,
}) => {
  await page.goto("/editor");
  await expect(page.getByRole("region", { name: "Pick a look to start" })).toBeVisible();
  await page.waitForTimeout(500);
  await expect(header(page).getByRole("link", { name: "Sign in with Twitch" })).toHaveCount(0);
  await expect(header(page).locator(".editor-account")).toHaveCount(0);
});

test("signed out: a Sign in with Twitch button that starts the sign-in", async ({ page }) => {
  await api(page, false);
  await page.goto("/editor");
  const signIn = header(page).getByRole("link", { name: "Sign in with Twitch" });
  await expect(signIn).toHaveAttribute("href", "/api/auth/twitch");
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
});

test("signed in: the Twitch picture and name, then sign out", async ({ page }) => {
  const calls = await api(page, true);
  await page.goto("/editor");
  const menu = header(page).locator(".editor-account-menu summary");
  await expect(menu).toHaveText("MoonStreamer");
  await expect(menu.locator("img")).toHaveAttribute("src", ME.avatarUrl);
  // Hidden until the profile is clicked: a closed details showed its panel until 2026-10-13.
  await expect(header(page).getByText("Signed in with Twitch as moonstreamer.")).toBeHidden();
  await expect(header(page).getByRole("button", { name: "Sign out", exact: true })).toBeHidden();
  await menu.click();
  await expect(header(page).getByText("Signed in with Twitch as moonstreamer.")).toBeVisible();
  expect(
    (await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze()).violations,
  ).toEqual([]);
  await header(page).getByRole("button", { name: "Sign out", exact: true }).click();
  await expect(header(page).getByRole("status")).toHaveText("You're signed out.");
  await expect(header(page).getByRole("link", { name: "Sign in with Twitch" })).toBeVisible();
  expect(calls).toContain("POST /api/auth/signout");
});

test("the account panel eases open, and just opens with reduced motion", async ({ page }) => {
  await api(page, true);
  await page.goto("/editor");
  const menu = header(page).locator(".editor-account-menu summary");
  await expect(menu).toHaveText("MoonStreamer");
  // The animation the panel plays as it opens.
  const easing = () =>
    page.evaluate(() =>
      document
        .getAnimations()
        .filter((a) => (a.effect as KeyframeEffect).target?.closest?.(".editor-account-menu"))
        .flatMap((a) => (a instanceof CSSAnimation ? [a.animationName] : [])),
    );
  await menu.click();
  expect(await easing()).toEqual(["account-in"]);
  await expect(header(page).getByText("Signed in with Twitch as moonstreamer.")).toBeVisible();
  await menu.click(); // closed again
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(400);
  await menu.click();
  expect(await easing()).toEqual([]);
  await expect(header(page).getByText("Signed in with Twitch as moonstreamer.")).toBeVisible();
});

test("deleting the account asks first, then signs out", async ({ page }) => {
  const calls = await api(page, true);
  await page.goto("/editor");
  await header(page).locator(".editor-account-menu summary").click();
  await header(page).getByRole("button", { name: "Delete my account…" }).click();
  await expect(
    header(page).getByText("This can't be undone. Your overlay links keep working."),
  ).toBeVisible();
  await header(page).getByRole("button", { name: "Keep it" }).click();
  expect(calls).not.toContain("DELETE /api/me");
  await header(page).getByRole("button", { name: "Delete my account…" }).click();
  await header(page).getByRole("button", { name: "Delete my account", exact: true }).click();
  await expect(header(page).getByRole("status")).toHaveText("Your account is deleted.");
  await expect(header(page).getByRole("link", { name: "Sign in with Twitch" })).toBeVisible();
  expect(calls).toContain("DELETE /api/me");
});

test("a failed sign-in says so, in plain words", async ({ page }) => {
  await api(page, false);
  await page.goto("/editor?signin=failed");
  await expect(header(page).getByRole("status")).toHaveText(
    "Signing in with Twitch didn't work. Please try again.",
  );
});
