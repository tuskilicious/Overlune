import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** A first visit opens on the gallery of looks (T6.16). Clean Slate keeps the editor's fresh defaults. */
const startEditing = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Clean Slate" }).click();

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await startEditing(page);
});

/** Rarely changed settings sit in closed disclosures (T6.20). */
const openMore = (page: import("@playwright/test").Page, name: string) =>
  page.getByText(name, { exact: true }).click();

const preview = (page: import("@playwright/test").Page) =>
  page.getByRole("region", { name: "Preview", exact: true });

// The preview is hidden from screen readers (it repeats the form), so find it by class, not role.
const previewTitle = (page: import("@playwright/test").Page, text: string) =>
  preview(page).locator(".scene-title", { hasText: text });

/** The time zone select is behind "Change" (T6.11). */
const pickTimeZone = async (page: import("@playwright/test").Page, tz: string) => {
  await page.getByRole("button", { name: "Change time zone" }).click();
  await page.getByLabel("Your time zone").selectOption(tz);
};

test("the time zone shows as text until you choose to change it", async ({ page }) => {
  await expect(page.locator(".editor-tz")).toContainText(/^Your time zone: .+ \(.+\)/);
  await expect(page.getByLabel("Your time zone")).toHaveCount(0);
  await page.getByRole("button", { name: "Change time zone" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByLabel("Your time zone")).toBeFocused();
  await page.getByLabel("Your time zone").selectOption("America/New_York");
  await expect(page.locator(".editor-tz")).toHaveText(
    "Your time zone: Eastern Time (America/New_York)",
  );
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);
});

/** "Load my overlay from a link" reveals the paste field (T6.12). */
const openLoad = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Load my overlay from a link" }).click();

test.describe("save file box (T6.12)", () => {
  const box = (page: import("@playwright/test").Page) => page.locator(".editor-save");

  test("is one compact line before anything is made", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /Your link is your save file/ })).toBeVisible();
    await expect(box(page)).not.toContainText("Bookmark this page");
    await expect(page.getByRole("button", { name: "Start over" })).toHaveCount(0);
    await expect(page.getByLabel("Paste a link from Overlune")).toBeHidden();
  });

  test("puts the bookmark reminder first once something is made", async ({ page }) => {
    await page.getByLabel("Title", { exact: true }).fill("My stream");
    await expect(box(page)).toContainText("Bookmark this page to keep your overlay.");
    await expect(page.getByRole("button", { name: "Start over" })).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });

  test("Load reveals the paste field from the keyboard", async ({ page }) => {
    const load = page.getByRole("button", { name: "Load my overlay from a link" });
    await expect(load).toHaveAttribute("aria-expanded", "false");
    await load.focus();
    await page.keyboard.press("Enter");
    await expect(load).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByLabel("Paste a link from Overlune")).toBeFocused();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
});

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
  await page.mouse.click(1, 1); // start Tab from the top of the page, not the picked look
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

  // Everything above was undone, so make a change for "Start over" to clear (it only shows then, T6.12).
  await page.getByLabel("Title", { exact: true }).fill("Something to clear");
  await page.getByRole("button", { name: "Start over" }).press("Enter");
  await page.getByRole("button", { name: "Cancel" }).press("Enter");
  await expect(page.getByRole("button", { name: "Start over" })).toBeFocused();
  await page.getByRole("button", { name: "Start over" }).press("Enter");
  await page.getByRole("button", { name: "Yes, start over" }).press("Enter");
  // Back to the defaults, so "Start over" is gone (T6.12); focus moves to the Load button.
  await expect(page.getByRole("button", { name: "Load my overlay from a link" })).toBeFocused();
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

test.describe("first visit (T6.16, T6.17)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("opens on a gallery of every look, before the editor", async ({ page }) => {
    const gallery = page.getByRole("region", { name: "Pick a look to start" });
    await expect(gallery.getByRole("button")).toHaveCount(8);
    for (const name of [
      "Clean Slate",
      "Neon Grid",
      "Cozy Café",
      "Arcade 8-Bit",
      "Pastel Cloud",
      "Forest Night",
      "Bold Esports",
      "Vaporwave Sunset",
    ])
      await expect(gallery.getByRole("button", { name, exact: true })).toBeVisible();
    await expect(page.getByLabel("Title", { exact: true })).toHaveCount(0);
    // Each card is the theme's real Starting Soon scene, held still.
    await expect(page.locator(".editor-welcome .scene")).toHaveCount(8);
    await expect(page.locator(".editor-welcome .scene-title").first()).toHaveCSS(
      "animation-name",
      "none",
    );
    // Returning streamers can still load a saved link.
    await expect(page.getByRole("button", { name: "Load my overlay from a link" })).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });

  test("picking a look from the keyboard opens the editor on it", async ({ page }) => {
    await page.getByRole("button", { name: "Neon Grid" }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("radio", { name: "Neon Grid" })).toBeChecked();
    await expect(page.getByRole("radio", { name: "Neon Grid" })).toBeFocused();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0); // opens at the top (T6.29)
    await expect(preview(page).locator(".scene")).toHaveAttribute("data-bg", "grid");
  });

  test("setting everything back to the defaults keeps the editor", async ({ page }) => {
    await page.getByRole("button", { name: "Neon Grid" }).click();
    await page.reload();
    await page.getByRole("radio", { name: "Clean Slate" }).check();
    await expect(page.getByLabel("Title", { exact: true })).toBeVisible();
  });

  test("picking the last look by mouse still opens at the top (T6.29)", async ({ page }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole("button", { name: "Vaporwave Sunset" }).click();
    await expect(page.getByRole("radio", { name: "Vaporwave Sunset" })).toBeFocused();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    await expect(page.getByRole("heading", { name: "1. Pick a look" })).toBeInViewport();
  });

  test("saved work skips the gallery", async ({ page }) => {
    await page.getByRole("button", { name: "Forest Night" }).click();
    await page.reload();
    await expect(page.getByRole("region", { name: "Pick a look to start" })).toHaveCount(0);
    await expect(page.getByRole("radio", { name: "Forest Night" })).toBeChecked();
  });
});

test.describe("steps (T6.18, T6.20)", () => {
  test("the steps bar jumps to each step and moves focus there", async ({ page }) => {
    const bar = page.getByRole("navigation", { name: "Steps" });
    await expect(bar.getByRole("link")).toHaveText([
      "1. Pick a look",
      "2. Add your details",
      "3. Links to paste into OBS",
    ]);
    await bar.getByRole("link", { name: "2. Add your details" }).click();
    await expect(page.getByRole("heading", { name: "2. Add your details" })).toBeFocused();
    await bar.getByRole("link", { name: "3. Links to paste into OBS" }).click();
    await expect(page.locator("#obs-links")).toBeFocused();
    await expect(page).toHaveURL(/\/#1\./); // jumping never replaces the settings in the address
  });

  test("rarely changed chat and alert settings start tucked away", async ({ page }) => {
    for (const label of ["Bots to hide", "Chat box width", "Text size", "Hide messages after"])
      await expect(page.getByLabel(label)).toBeHidden();
    await expect(page.getByLabel("Raid message", { exact: true })).toBeHidden();
    await expect(page.getByLabel("Your Twitch channel name")).toBeVisible();
    await expect(page.getByLabel(/^Alert volume/)).toBeVisible();

    await openMore(page, "More chat options");
    await expect(page.getByLabel("Bots to hide")).toBeVisible();
    await openMore(page, "Change alert messages");
    await expect(page.getByLabel("Raid message", { exact: true })).toBeVisible();
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });
});

test("the logo field shows the logo, or a friendly message when no picture loads (T6.21)", async ({
  page,
}) => {
  await page.route("https://logos.example/ok.png", (r) =>
    r.fulfill({ path: "public/images/brand/logo.png" }),
  );
  await page.route("https://logos.example/page", (r) =>
    r.fulfill({ contentType: "text/html", body: "<p>not a picture</p>" }),
  );
  const logo = page.getByLabel("Link to your logo image");
  await expect(page.getByText("Copy image address")).toBeVisible();

  await logo.fill("https://logos.example/page");
  await expect(page.locator("#logo-error")).toHaveText(/^No picture loaded from this link/);
  await expect(logo).toHaveAttribute("aria-invalid", "true");

  await logo.fill("https://logos.example/ok.png");
  await expect(page.getByRole("img", { name: "Your logo" })).toBeVisible();
  await expect(page.locator("#logo-error")).toHaveText("");
});

test("alert messages can be built without typing codes (T6.19)", async ({ page }) => {
  await openMore(page, "Change alert messages");
  const raid = page.getByLabel("Raid message", { exact: true });
  const example = page.locator("#template-raid-example");
  await expect(example).toHaveText("Example: FriendlyRaider is raiding with 42 viewers!");

  await raid.fill("Thanks for the raid, !");
  await raid.press("End");
  await raid.press("ArrowLeft");
  await page.getByRole("button", { name: "Add their name to Raid message" }).click();
  await expect(raid).toHaveValue("Thanks for the raid, {user}!");
  await expect(raid).toBeFocused();
  await expect(example).toHaveText("Example: Thanks for the raid, FriendlyRaider!");

  // An empty message is the default, so the button adds to the default.
  await expect(page.getByRole("button", { name: "Add the amount to Bits message" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add the amount to New sub message" })).toHaveCount(
    0,
  );
  await page.getByRole("button", { name: "Add their name to Bits message" }).click();
  await expect(page.getByLabel("Bits message", { exact: true })).toHaveValue(
    "{user} cheered {amount} bit{s}!{user}",
  );
});

test("copied links are marked, and the last copy says what's next (T6.24)", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const links = page.getByRole("region", { name: "Links to paste into OBS" });
  await links.getByRole("button", { name: "Copy Starting Soon link" }).click();
  await expect(links.getByRole("listitem").first()).toContainText("✓ Copied");
  await expect(links.getByText("1 of 5 links copied.")).toBeVisible();

  // Editing changes every link, so the copy in OBS is out of date.
  await page.getByLabel("Title", { exact: true }).fill("Soon!");
  await expect(links.getByRole("listitem").first()).toContainText(
    "Changed since you copied it. Copy it again.",
  );

  for (const name of ["Starting Soon", "Be Right Back", "Stream Ending", "Chat", "Alerts"])
    await links.getByRole("button", { name: `Copy ${name} link` }).click();
  await expect(links.getByText("You’re set: all 5 links copied.")).toBeVisible();
  await expect(links.getByRole("link", { name: "setup guide", exact: true })).toHaveAttribute(
    "href",
    "/guide",
  );
});

test("nearly full text fields say how many characters are left (T6.28)", async ({ page }) => {
  const title = page.getByLabel("Title", { exact: true });
  await title.fill("Starting soon");
  await expect(page.locator("#chars-title")).toHaveText("");
  await title.fill("x".repeat(51));
  await expect(page.locator("#chars-title")).toHaveText("9 characters left");
  await expect(title).toHaveAttribute("aria-describedby", "chars-title");
  await title.fill("x".repeat(59));
  await expect(page.locator("#chars-title")).toHaveText("1 character left");
  await title.pressSequentially("yz");
  await expect(title).toHaveValue("x".repeat(59) + "y");
  await expect(page.locator("#chars-title")).toHaveText("0 characters left");
});

test("the scene preview stays in view while the form scrolls (T6.30)", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByLabel("Link to your logo image").scrollIntoViewIfNeeded();
  await expect(preview(page).locator(".scene")).toBeInViewport();
  // The preview column scrolls on its own to reach the alert test buttons.
  await page.getByRole("button", { name: "Test raid" }).scrollIntoViewIfNeeded();
  await expect(page.getByRole("button", { name: "Test raid" })).toBeInViewport();
});

test("all 8 looks fit on a laptop screen without scrolling (T6.31)", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => scrollTo(0, 0));
  for (const name of ["Clean Slate", "Vaporwave Sunset"])
    await expect(page.locator(".editor-themes .editor-card", { hasText: name })).toBeInViewport({
      ratio: 1,
    });
});

test("the steps bar marks the step on screen (T6.32)", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  const bar = page.getByRole("navigation", { name: "Steps" });
  const current = bar.locator('[aria-current="step"]');
  await expect(current).toHaveText("1. Pick a look");
  await page.getByLabel("Your Twitch channel name").scrollIntoViewIfNeeded();
  await expect(current).toHaveText("2. Add your details");
  await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
  await expect(current).toHaveText("3. Links to paste into OBS");
  await expect(bar.locator('[aria-current="step"]')).toHaveCount(1);
});

test("the look picker shows each theme as a picture you can click", async ({ page }) => {
  await page
    .locator(".editor-themes .editor-card", { hasText: "Vaporwave Sunset" })
    .locator(".editor-shot")
    .click();
  await expect(page.getByRole("radio", { name: "Vaporwave Sunset" })).toBeChecked();
  await expect(page.locator(".editor-themes .scene")).toHaveCount(8);
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
  await expect(page.locator("#logo-error")).toContainText("This link must start with https://");
  await expect(preview(page).locator("img")).toHaveCount(0);

  await logo.fill("https://example.com/logo.png");
  await expect(page.locator("#logo-error")).not.toContainText("https://");
  await expect(preview(page).locator("img")).toHaveAttribute("src", "https://example.com/logo.png");
});

test("the countdown time keeps its clock time when the time zone changes", async ({ page }) => {
  const endsAt = page.getByLabel("Countdown ends at");
  await endsAt.fill("2026-10-01T20:00");
  await pickTimeZone(page, "Asia/Tokyo");
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
  await pickTimeZone(page, "UTC");
  const inAnHour = new Date(Date.now() + 3_600_000).toISOString().slice(0, 16);
  await page.getByLabel("Countdown ends at").fill(inAnHour);
  await expect(preview(page).locator(".countdown-time")).toHaveText(/^\d{2}:\d{2}$|^1:00:00$/);
  // "tomorrow" when the test runs in the last hour before UTC midnight.
  await expect(preview(page).getByText(/^Starts (at|tomorrow,) .* UTC$/)).toBeVisible();
});

test("a repeating countdown counts to the next stream and is saved", async ({ page }) => {
  await pickTimeZone(page, "UTC");
  await page.getByLabel("Repeat this countdown every stream").selectOption("Every day");
  await expect(page.getByLabel("Countdown ends at")).toHaveCount(0);
  const inTwoHours = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(11, 16);
  await page.getByLabel("Stream starts at").fill(inTwoHours);
  await expect(preview(page).locator(".countdown-time")).toHaveText(/^1:5\d:\d{2}$|^2:00:00$/);

  await page.getByLabel("Repeat this countdown every stream").selectOption("On these days");
  await page.getByRole("checkbox", { name: "Sat" }).check();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  await page.reload();
  await expect(page.getByLabel("Repeat this countdown every stream")).toHaveValue("days");
  await expect(page.getByRole("checkbox", { name: "Sat" })).toBeChecked();
  await expect(page.getByLabel("Stream starts at")).toHaveValue(inTwoHours);
});

test("a countdown days away shows days and names the start day", async ({ page }) => {
  await pickTimeZone(page, "UTC");
  const inTwoDays = new Date(Date.now() + 50 * 3_600_000).toISOString().slice(0, 16);
  await page.getByLabel("Countdown ends at").fill(inTwoDays);
  await expect(preview(page).locator(".countdown-time")).toHaveText(/^2d \d{1,2}h \d{1,2}m$/);
  await expect(preview(page).getByText(/^Starts \w{3} \d{1,2} \w{3}, .* UTC$/)).toBeVisible();
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
  await startEditing(page);
  await page.getByRole("radio", { name: "Be Right Back" }).check();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Be right back");

  await openLoad(page);
  await page.getByLabel("Paste a link from Overlune").fill(link);
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
  await openLoad(page);
  await page.getByLabel("Paste a link from Overlune").fill("https://example.com/");
  await page.getByLabel("Paste a link from Overlune").press("Enter");
  await expect(page.getByRole("status").filter({ hasText: "doesn’t look like" })).toBeVisible();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("My title");
});

test("a damaged link loads what it can and says so", async ({ page }) => {
  await openLoad(page);
  await page.getByLabel("Paste a link from Overlune").fill("https://overlune.pages.dev/o/brb#1.x");
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
  const before = page.url();
  await page.getByLabel("Title", { exact: true }).fill("From the link");
  await expect.poll(() => page.url()).not.toBe(before); // the address updates just after the render
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
  await startEditing(page);
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
  // Nothing left to restore, so a new visit opens on the gallery again (T6.16).
  await expect(page.getByRole("region", { name: "Pick a look to start" })).toBeVisible();
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
  await openMore(page, "More chat options");
  const box = page.getByLabel("Bots to hide");
  await expect(box).toHaveValue(/^nightbot\nstreamelements\n/);
  await box.fill("MyBot\n");
  await expect(box).toHaveValue("MyBot\n"); // typing isn't rewritten under the cursor
  await page.reload();
  await expect(page.getByLabel("Bots to hide")).toHaveValue("mybot");
  await openMore(page, "More chat options");
  await page.getByRole("button", { name: "Reset to the usual bots" }).click();
  await expect(page.getByLabel("Bots to hide")).toHaveValue(/^nightbot\n/);
  await expect(page.getByLabel("Hide chat commands")).toBeChecked();
});

test("chat size and text options update the link row and the chat preview", async ({ page }) => {
  const preview = page.getByRole("region", { name: "Chat preview" });
  await expect(preview.getByText("Love the new look")).toBeAttached();
  await expect(preview.locator("img.chat-emote")).toHaveAttribute("alt", "Kappa");

  await openMore(page, "More chat options");
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
    await openMore(page, "Change alert messages");
    await page
      .getByLabel("Raid message", { exact: true })
      .fill("Welcome {user} and {amount} friends!");
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
    await startEditing(page);
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

  test("a still sample raid fills the box between test alerts (T6.22)", async ({ page }) => {
    const box = tester(page).locator(".alert-box");
    await expect(box).toHaveAttribute("data-kind", "raid");
    await expect(box).toHaveCSS("animation-name", "none");
    await expect(
      page.getByRole("region", { name: "Chat preview" }).locator(".chat-msg"),
    ).toHaveCount(9);
  });

  test("follows and donations are one line of coming-soon text", async ({ page }) => {
    await expect(
      tester(page).getByText("Follow and donation alerts are coming in a later version."),
    ).toBeVisible();
    await expect(tester(page).getByRole("button", { name: /Follow|Donation/ })).toHaveCount(0);
  });

  test("offers a test link for OBS that carries the settings", async ({ page }) => {
    await page.getByLabel("Your Twitch channel name").fill("dallas");
    const link = await tester(page)
      .getByRole("textbox", { name: /Link to test your alerts in OBS/ })
      .inputValue();
    const until = Number(link.match(/\/o\/alerts\?test=1&until=(\d+)#1\./)?.[1]);
    // Stops playing samples about 15 minutes from now.
    expect(Math.abs(until - (Date.now() / 1000 + 15 * 60))).toBeLessThan(120);
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

test("picking Forest Night restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Forest Night" }).check();
  await expect(preview(page).locator(".scene")).toHaveAttribute("data-bg", "fireflies");
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Lora/);

  const sound = page.waitForRequest(/\/sounds\/forest-night\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "slide-fade");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Forest Night" })).toBeChecked();
});

test("picking Bold Esports restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Bold Esports" }).check();
  await expect(preview(page).locator(".scene")).toHaveAttribute("data-enter", "wipe");
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Anton/);

  const sound = page.waitForRequest(/\/sounds\/bold-esports\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "wipe");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Bold Esports" })).toBeChecked();
});

test("picking Vaporwave Sunset restyles the preview, alerts and sound", async ({ page }) => {
  await page.getByRole("radio", { name: "Vaporwave Sunset" }).check();
  await expect(preview(page).locator(".scene")).toHaveAttribute("data-bg", "sunset");
  // The look cards may have fetched it already, so check the page's resource log rather than wait for a request.
  await expect
    .poll(() =>
      page.evaluate(() =>
        performance
          .getEntriesByType("resource")
          .some(
            (e) =>
              e.name.endsWith("/images/themes/vaporwave-palms.svg") &&
              (e as PerformanceResourceTiming).responseStatus === 200,
          ),
      ),
    )
    .toBe(true);
  await expect(previewTitle(page, "Starting soon")).toHaveCSS("font-family", /Audiowide/);

  const sound = page.waitForRequest(/\/sounds\/vaporwave-sunset\.ogg$/);
  await page.getByRole("button", { name: "Test raid" }).click();
  await expect(
    page.getByRole("region", { name: "Preview: Alerts" }).locator(".alerts"),
  ).toHaveAttribute("data-anim", "slide-fade");
  await sound;

  await page.reload();
  await expect(page.getByRole("radio", { name: "Vaporwave Sunset" })).toBeChecked();
});

test.describe("narrow editor window (T6.10)", () => {
  const scan = (page: import("@playwright/test").Page) =>
    new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const toggle = (page: import("@playwright/test").Page) =>
    page.getByRole("button", { name: /^(Show|Hide) preview$/ });

  test("a bar pinned to the bottom shows and hides the preview", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await expect(toggle(page)).toHaveText("Show preview");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
    await expect(preview(page).locator(".scene")).toBeHidden();
    const bar = await toggle(page).boundingBox();
    expect(bar!.y + bar!.height).toBeGreaterThan(800 - 80); // at the bottom of the window
    expect((await scan(page)).violations).toEqual([]);

    await toggle(page).click();
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await expect(toggle(page)).toHaveText("Hide preview");
    await page.getByLabel("Title", { exact: true }).fill("Narrow window");
    await expect(previewTitle(page, "Narrow window")).toBeVisible();
    expect((await scan(page)).violations).toEqual([]);
  });

  test("works from the keyboard", async ({ page }) => {
    await page.setViewportSize({ width: 600, height: 800 });
    await toggle(page).focus();
    await page.keyboard.press("Enter");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
    await page.keyboard.press("Space");
    await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
  });

  test("wide windows keep the preview beside the form, with no bar", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await expect(toggle(page)).toBeHidden();
    await expect(preview(page).locator(".scene")).toBeVisible();
  });
});
