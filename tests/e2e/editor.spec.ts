import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
});

const preview = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Preview", exact: true });

// The preview is hidden from screen readers (it repeats the form), so find it by class, not role.
const previewTitle = (page: import("@playwright/test").Page, text: string) =>
  preview(page).locator(".scene-title", { hasText: text });

test("the editor has no axe accessibility violations", async ({ page }) => {
  const scan = () =>
    new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect((await scan()).violations).toEqual([]);

  await page.getByText("Advanced: colors and fonts").click();
  await page.getByRole("button", { name: "Add a social" }).click();
  await page.getByRole("button", { name: "Start over" }).click();
  expect((await scan()).violations).toEqual([]);
});

test("the whole editor works from the keyboard", async ({ page }) => {
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to your OBS links" })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#obs-links")).toBeFocused();
  await expect(page).toHaveURL(/\/#1\./); // the skip link never replaces the settings in the address

  await page.getByRole("radio", { name: "Starting Soon" }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Be Right Back" })).toBeChecked();
  await page.keyboard.press("Tab");
  await page.keyboard.type("Keyboard title");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Keyboard title");

  await page.getByRole("button", { name: "Add a social" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Site")).toBeVisible();

  await page.locator("#advanced-summary").focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Titles")).toBeVisible();
});

test("focus stays in place when the button you pressed goes away", async ({ page }) => {
  await page.getByRole("button", { name: "Add a social" }).click();
  await page.getByRole("button", { name: /^Remove/ }).press("Enter");
  await expect(page.getByRole("button", { name: "Add a social" })).toBeFocused();

  await page.getByText("Advanced: colors and fonts").click();
  await page.getByLabel("Titles").fill("#ff0000");
  await page.getByRole("button", { name: "Reset Titles to the theme" }).press("Enter");
  await expect(page.getByLabel("Titles")).toBeFocused();

  await page.getByLabel("Titles").fill("#ff0000");
  await page.getByRole("button", { name: "Reset all to the theme" }).press("Enter");
  await expect(page.locator("#advanced-summary")).toBeFocused();

  await page.getByRole("button", { name: "Start over" }).press("Enter");
  await page.getByRole("button", { name: "Cancel" }).press("Enter");
  await expect(page.getByRole("button", { name: "Start over" })).toBeFocused();
  await page.getByRole("button", { name: "Start over" }).press("Enter");
  await page.getByRole("button", { name: "Yes, start over" }).press("Enter");
  await expect(page.getByRole("button", { name: "Start over" })).toBeFocused();
});

test("keyboard focus is always visible", async ({ page }) => {
  await page.getByRole("button", { name: "Add a social" }).click();
  await page.getByText("Advanced: colors and fonts").click();
  // Reach the first stop with a real key press, so the browser treats focus as keyboard focus.
  await page.getByRole("link", { name: "Skip to your OBS links" }).focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  let visited = 0;
  // Tab through the whole page from the first stop; every stop must show the 2px focus ring.
  for (; ; await page.keyboard.press("Tab")) {
    const focused = await page.evaluate(() => {
      const el = document.activeElement!;
      const s = getComputedStyle(el);
      return {
        tag: el.tagName,
        ring: `${s.outlineStyle} ${s.outlineWidth}`,
        label: el.outerHTML.slice(0, 60),
      };
    });
    if (focused.tag === "BODY") break;
    // ponytail: Chrome's built-in calendar button inside the date field is its own Tab stop that pages
    // can't style or detect (the field reports no focus). Keyboard users type the date or press Space instead.
    if (focused.ring === "none 3px" && focused.label.startsWith('<input type="datetime-local"'))
      continue;
    expect(focused.ring, focused.label).toBe("solid 2px");
    expect(++visited).toBeLessThan(80);
  }
  expect(visited).toBeGreaterThan(30);
});

test("the editor shows Starting Soon in the preview by default", async ({ page }) => {
  await expect(page.getByRole("heading", { name: "Overlune" })).toBeVisible();
  await expect(page.getByRole("radio", { name: "Clean Slate" })).toBeChecked();
  await expect(previewTitle(page, "Starting soon")).toBeVisible();
});

test("typing a title updates the preview of the chosen scene", async ({ page }) => {
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await expect(previewTitle(page, "Be right back")).toBeVisible();
  await page.getByLabel("Title", { exact: true }).fill("Grabbing snacks");
  await expect(previewTitle(page, "Grabbing snacks")).toBeVisible();

  await page.getByRole("radio", { name: "Stream Ending" }).check();
  await expect(previewTitle(page, "Thanks for watching!")).toBeVisible();
});

test("socials can be added and removed", async ({ page }) => {
  await page.getByRole("button", { name: "Add a social" }).click();
  await page.getByLabel("Site").selectOption("youtube");
  await page.getByLabel("Name or handle").fill("mychannel");
  await expect(preview(page).getByText("YouTube mychannel")).toBeVisible();
  await page.getByRole("button", { name: "Remove YouTube mychannel" }).click();
  await expect(preview(page).locator("ul")).toHaveCount(0);
});

test("only https: logo links reach the preview", async ({ page }) => {
  const logo = page.getByLabel("Link to your logo image");
  await logo.fill("javascript:alert(1)");
  await expect(page.locator("#logo-error")).toHaveText("This link must start with https://");
  await expect(preview(page).locator("img")).toHaveCount(0);

  await logo.fill("https://example.com/logo.png");
  await expect(page.locator("#logo-error")).toHaveText("");
  await expect(preview(page).locator("img")).toHaveAttribute("src", "https://example.com/logo.png");
});

test("the countdown time keeps its clock time when the time zone changes", async ({ page }) => {
  const endsAt = page.getByLabel("Countdown ends at");
  await endsAt.fill("2026-10-01T20:00");
  await page.getByLabel("Your time zone").selectOption("Asia/Tokyo");
  await expect(endsAt).toHaveValue("2026-10-01T20:00");
});

test("every control has a label", async ({ page }) => {
  await page.getByRole("button", { name: "Add a social" }).click();
  for (const el of await page.locator("input, select").all()) {
    expect(await el.evaluate((e) => (e as HTMLInputElement).labels?.length ?? 0)).toBeGreaterThan(
      0,
    );
  }
});

test("the preview runs the real overlay, countdown included", async ({ page }) => {
  await page.getByLabel("Your time zone").selectOption("UTC");
  const inAnHour = new Date(Date.now() + 3_600_000).toISOString().slice(0, 16);
  await page.getByLabel("Countdown ends at").fill(inAnHour);
  await expect(preview(page).locator(".countdown-time")).toHaveText(/^\d{2}:\d{2}$|^1:00:00$/);
  await expect(preview(page).getByText(/^Starts at .* UTC$/)).toBeVisible();
});

test("each overlay link shows the size to enter in OBS", async ({ page }) => {
  const rows = page.getByRole("region", { name: "Links to paste into OBS" }).getByRole("listitem");
  await expect(rows).toHaveCount(5);
  for (const row of (await rows.all()).slice(0, 3))
    await expect(row).toContainText("Width 1920 · Height 1080");
  await expect(rows.nth(3)).toContainText("Chat · Width 400 · Height 600");
  await expect(rows.nth(4)).toContainText("Alerts · Width 1920 · Height 1080");
});

test("a pasted Twitch link becomes the channel name in the chat link", async ({ page }) => {
  const field = page.getByLabel("Your Twitch channel name");
  await field.fill("https://www.twitch.tv/Some_Streamer");
  await expect(field).toHaveValue("Some_Streamer");
  const link = await page.getByRole("textbox", { name: /^Chat/ }).inputValue();
  expect(link).toMatch(/\/o\/chat#1\./);
});

test("an old link loads back into the editor", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await page.getByLabel("Title", { exact: true }).fill("Grabbing snacks");
  await page.getByLabel("Link to your logo image").fill("https://example.com/logo.png");
  await page.getByRole("button", { name: "Copy Be Right Back link" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());

  await page.evaluate(() => localStorage.clear()); // a different browser, no autosave
  await page.goto("/");
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Be right back");

  await page.getByLabel("Load my overlay from a link").fill(link);
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Loaded!" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Grabbing snacks");
  await expect(page.getByLabel("Link to your logo image")).toHaveValue(
    "https://example.com/logo.png",
  );
  await expect(previewTitle(page, "Grabbing snacks")).toBeVisible();
});

test("text that isn't an Overlune link changes nothing", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("My title");
  await page.getByLabel("Load my overlay from a link").fill("https://example.com/");
  await page.getByLabel("Load my overlay from a link").press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "doesn’t look like" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("My title");
});

test("a damaged link loads what it can and says so", async ({ page }) => {
  await page.getByLabel("Load my overlay from a link").fill("https://overlune.pages.dev/o/brb#1.x");
  await page.getByRole("button", { name: "Load", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "couldn’t be read" })).toBeVisible();
});

test("the editor's own address saves the work, so reload or a bookmark keeps it", async ({
  page,
}) => {
  await page.getByLabel("Title", { exact: true }).fill("Bookmarked title");
  await expect(page).toHaveURL(/\/#1\./);
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Bookmarked title");
  await expect(page.getByRole("status").filter({ hasText: "Loaded!" })).toBeVisible();
});

test("autosave restores the last overlay when the editor opens without a link", async ({
  page,
}) => {
  await page.getByLabel("Title", { exact: true }).fill("Autosaved title");
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Autosaved title");
  await expect(page.getByRole("status").filter({ hasText: "Welcome back!" })).toBeVisible();
});

test("a link in the address wins over the autosave", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("From the link");
  const link = page.url();
  await page.getByLabel("Title", { exact: true }).fill("Autosaved later");
  await page.goto("about:blank");
  await page.goto(link);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("From the link");
});

test("the editor still works when browser storage is blocked", async ({ page }) => {
  await page.addInitScript(() => {
    const blocked = () => {
      throw new DOMException("blocked", "SecurityError");
    };
    Storage.prototype.getItem = blocked;
    Storage.prototype.setItem = blocked;
  });
  await page.goto("/");
  await page.getByLabel("Title", { exact: true }).fill("Still works");
  await expect(previewTitle(page, "Still works")).toBeVisible();
});

test("start over asks first, then resets to the defaults", async ({ page }) => {
  await page.getByLabel("Title", { exact: true }).fill("Old title");
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Old title");

  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("button", { name: "Yes, start over" }).click();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Starting soon");
  await page.goto("about:blank");
  await page.goto("/");
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Starting soon");
});

test("Advanced starts closed, and overrides reach the preview and the OBS link", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const titleColor = page.getByLabel("Titles");
  await expect(titleColor).toBeHidden();
  await page.getByText("Advanced: colors and fonts").click();
  await expect(titleColor).toHaveValue("#e8eaed");

  await titleColor.fill("#ff2bd6");
  await page.getByLabel("Heading font").selectOption("Orbitron");
  const title = previewTitle(page, "Starting soon");
  await expect(title).toHaveCSS("color", "rgb(255, 43, 214)");
  await expect(title).toHaveCSS("font-family", /^"?Orbitron/);

  await page.getByRole("button", { name: "Copy Starting Soon link" }).click();
  await page.goto(await page.evaluate(() => navigator.clipboard.readText()));
  await expect(page.getByRole("heading", { name: "Starting soon" })).toHaveCSS(
    "color",
    "rgb(255, 43, 214)",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("hard-to-read colors show a warning, and reset brings the theme back", async ({ page }) => {
  await page.getByText("Advanced: colors and fonts").click();
  const warning = page.getByRole("status").filter({ hasText: "hard to read" });
  await page.getByLabel("Text", { exact: true }).fill("#20232a");
  await expect(warning).toBeVisible();

  await page.getByRole("button", { name: "Reset Text to the theme" }).click();
  await expect(warning).toHaveCount(0);
  await expect(page.getByLabel("Text", { exact: true })).toHaveValue("#e8eaed");

  await page.getByLabel("Titles").fill("#00ff00");
  await page.getByRole("button", { name: "Reset all to the theme" }).click();
  await expect(page.getByLabel("Titles")).toHaveValue("#e8eaed");
  await expect(page.getByRole("button", { name: /^Reset (?!all).* to the theme$/ })).toHaveCount(0);
});

test("a copied link opens the overlay with the editor's settings", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await page.getByLabel("Title", { exact: true }).fill("Grabbing snacks");

  await page.getByRole("button", { name: "Copy Be Right Back link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Copied!" })).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toMatch(/\/o\/brb#1\./);

  await page.goto(link);
  await expect(page.getByRole("heading", { name: "Grabbing snacks" })).toBeVisible();
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("the bot list can be edited and reset", async ({ page }) => {
  const box = page.getByLabel("Bots to hide");
  await expect(box).toHaveValue(/^nightbot\nstreamelements\n/);
  await box.fill("MyBot\n");
  await expect(box).toHaveValue("MyBot\n"); // typing isn't rewritten under the cursor
  await page.reload();
  await expect(page.getByLabel("Bots to hide")).toHaveValue("mybot");
  await page.getByRole("button", { name: "Reset to the usual bots" }).click();
  await expect(page.getByLabel("Bots to hide")).toHaveValue(/^nightbot\n/);
  await expect(page.getByLabel("Hide chat commands")).toBeChecked();
});

test("chat size and text options update the link row and the chat preview", async ({ page }) => {
  const preview = page.getByRole("region", { name: "Chat preview" });
  await expect(preview.getByText("Love the new look")).toBeAttached();
  await expect(preview.locator("img.chat-emote")).toHaveAttribute("alt", "Kappa");

  const width = page.getByLabel("Chat box width");
  await width.fill("3"); // half-typed: not saved, shows a hint
  await expect(page.getByText("Use a whole number from 250 to 1920.")).toBeVisible();
  await width.fill("500");
  await page.getByLabel("Chat box height").fill("800");
  await page.getByLabel("Text size").selectOption("1.5");
  await page.getByLabel("Hide messages after").selectOption("30");

  const rows = page.getByRole("region", { name: "Links to paste into OBS" }).getByRole("listitem");
  await expect(rows.nth(3)).toContainText("Chat · Width 500 · Height 800");
  await expect(preview.locator(".chat")).toHaveCSS("width", "500px");
  await expect(preview.locator(".chat")).toHaveCSS("font-size", "30px");

  await page.reload();
  await expect(page.getByLabel("Chat box width")).toHaveValue("500");
  await expect(page.getByLabel("Hide messages after")).toHaveValue("30");
});

test.describe("alert test buttons", () => {
  const tester = (page: import("@playwright/test").Page) =>
    page.getByRole("region", { name: "Preview: Alerts" });

  test("a test button shows the alert with your message and plays the sound", async ({ page }) => {
    await page.getByLabel("Raid message").fill("Welcome {user} and {amount} friends!");
    const sound = page.waitForRequest(/\/sounds\/clean-slate\.ogg$/);
    await page.getByRole("button", { name: "Test raid" }).click();
    await expect(tester(page).locator(".alert-box")).toHaveText(
      "Welcome FriendlyRaider and 42 friends!",
    );
    await sound;
  });

  test("quick clicks play one alert at a time, in order", async ({ page }) => {
    await page.clock.install();
    await page.reload();
    for (const name of ["Test sub", "Test gift sub", "Test bits"])
      await page.getByRole("button", { name }).click();
    const box = tester(page).locator(".alert-box");
    await expect(box).toHaveCount(1);
    await expect(box).toHaveAttribute("data-kind", "sub");
    await page.clock.runFor(5_500);
    await expect(box).toHaveAttribute("data-kind", "subgift");
    await page.clock.runFor(5_500);
    await expect(box).toHaveAttribute("data-kind", "bits");
  });

  test("follows and donations are labeled coming soon", async ({ page }) => {
    await expect(page.getByRole("button", { name: "Follow (coming soon)" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Donation (coming soon)" })).toBeDisabled();
  });

  test("offers a test link for OBS that carries the settings", async ({ page }) => {
    await page.getByLabel("Your Twitch channel name").fill("dallas");
    const link = await tester(page)
      .getByRole("textbox", { name: /Link to test your alerts in OBS/ })
      .inputValue();
    expect(link).toMatch(/\/o\/alerts\?test=1#1\./);
    const normal = await page.getByRole("textbox", { name: /^Alerts/ }).inputValue();
    expect(link.split("#")[1]).toBe(normal.split("#")[1]);
  });
});

test("every preview is scaled to fit its box", async ({ page }) => {
  await page.getByRole("button", { name: "Test raid" }).click();
  for (const sel of [".scene", ".chat", ".alerts"]) {
    const el = page.locator(`.editor-preview > ${sel}`).first();
    const box = await el.boundingBox();
    const frame = await el.locator("..").boundingBox();
    expect(box!.width).toBeLessThanOrEqual(frame!.width + 1);
  }
});

test("picking Neon Grid restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Neon Grid" }).check();
  const scene = preview(page).locator(".scene");
  await expect(scene).toHaveAttribute("data-bg", "grid");
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Orbitron/);

  const sound = page.waitForRequest(/\/sounds\/neon-grid\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "glitch");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Neon Grid" })).toBeChecked();
});

test("picking Cozy Café restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Cozy Café" }).check();
  await expect(preview(page).locator(".scene")).toHaveAttribute("data-bg", "steam");
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Fredoka/);

  const sound = page.waitForRequest(/\/sounds\/cozy-cafe\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "bounce");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Cozy Café" })).toBeChecked();
});

test("picking Arcade 8-Bit restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Arcade 8-Bit" }).check();
  await expect(preview(page).locator(".scene")).toHaveAttribute("data-bg", "scanlines");
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Press Start 2P/);

  const sound = page.waitForRequest(/\/sounds\/arcade-8bit\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "steps");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Arcade 8-Bit" })).toBeChecked();
});

test("picking Pastel Cloud restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Pastel Cloud" }).check();
  await expect(preview(page).locator(".scene")).toHaveAttribute("data-bg", "clouds");
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Baloo 2/);

  const sound = page.waitForRequest(/\/sounds\/pastel-cloud\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "bounce");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Pastel Cloud" })).toBeChecked();
});
