import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

/** A first visit opens on the gallery of looks (T6.16). Clean Slate keeps the editor's fresh defaults. */
const startEditing = (page: import("@playwright/test").Page) =>
  page.getByRole("button", { name: "Clean Slate" }).click();

test.beforeEach(async ({ page }) => {
  await page.goto("/editor");
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

  test("keeps its buttons in place, opens one panel at a time, and Escape closes it (T6.58)", async ({
    page,
  }) => {
    await page.getByLabel("Title", { exact: true }).fill("My stream");
    const load = page.getByRole("button", { name: "Load my overlay from a link" });
    const reset = page.getByRole("button", { name: "Start over", exact: true });
    // Where each button sits on the page (not the window, which scrolls when a field takes focus).
    const spot = (b: typeof load) =>
      b.evaluate((el) => {
        const r = el.getBoundingClientRect();
        return [Math.round(r.x), Math.round(r.y + scrollY)];
      });
    const spots = async () => [await spot(load), await spot(reset)];
    const before = await spots();
    await load.click();
    expect(await spots()).toEqual(before);
    await reset.click();
    expect(await spots()).toEqual(before);
    await expect(page.getByLabel("Paste a link from Overlune")).toBeHidden();
    await expect(page.getByRole("button", { name: "Cancel" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Yes, start over" })).toBeHidden();
    await expect(reset).toBeFocused();
    await load.click();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Paste a link from Overlune")).toBeHidden();
    await expect(load).toBeFocused();
    // Escape works even before focus has moved into the panel (the CI flake in run 37125681641).
    await load.click();
    await load.focus();
    await page.keyboard.press("Escape");
    await expect(page.getByLabel("Paste a link from Overlune")).toBeHidden();
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
  await expect(page).toHaveURL(/\/editor#1\./); // the skip link never replaces the settings in the address

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
    await page.goto("/editor");
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

  test("look pictures show sample content, which never reaches the streamer's scene (T6.47)", async ({
    page,
  }) => {
    // The cards show the whole layout: subtitle, countdown card and socials.
    await expect(page.locator(".editor-welcome .countdown")).toHaveCount(8);
    await expect(page.locator(".editor-welcome .scene-socials")).toHaveCount(8);
    await page.getByRole("button", { name: "Cozy Café" }).click();
    await expect(page.getByLabel("Subtitle")).toHaveValue("");
    await expect(preview(page).locator(".countdown")).toHaveCount(0);
    await expect(preview(page).locator(".scene-socials")).toHaveCount(0);
  });

  test("on a 1366×768 laptop the whole scene preview is in view after picking a look (T6.49)", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.getByRole("button", { name: "Bold Esports" }).click();
    await expect.poll(() => page.evaluate(() => scrollY)).toBe(0);
    const box = (await page.locator(".editor-scene-preview .editor-preview").boundingBox())!;
    expect(box.y + box.height).toBeLessThanOrEqual(768);
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
    await page.setViewportSize({ width: 1100, height: 800 }); // wider windows have the section list (T6.60)
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
    await expect(page).toHaveURL(/\/editor#1\./); // jumping never replaces the settings in the address
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
  await expect(links.locator(".editor-link").first()).toContainText("✓ Copied");
  await expect(links.getByText("1 of 5 links copied.")).toBeVisible();

  // Editing changes every link, so the copy in OBS is out of date.
  await page.getByLabel("Title", { exact: true }).fill("Soon!");
  await expect(links.locator(".editor-link").first()).toContainText(
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
  await page.setViewportSize({ width: 1100, height: 768 }); // wider windows have the section list (T6.60)
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
  await page.getByRole("combobox", { name: /^Countdown/ }).selectOption("Every day, same time");
  await expect(page.getByLabel("Countdown ends at")).toHaveCount(0);
  const inTwoHours = new Date(Date.now() + 2 * 3_600_000).toISOString().slice(11, 16);
  await page.getByLabel("Stream starts at").fill(inTwoHours);
  await expect(preview(page).locator(".countdown-time")).toHaveText(/^1:5\d:\d{2}$|^2:00:00$/);

  await page.getByRole("combobox", { name: /^Countdown/ }).selectOption("On these days each week");
  await page.getByRole("checkbox", { name: "Sat" }).check();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(scan.violations).toEqual([]);

  await page.reload();
  await expect(page.getByRole("combobox", { name: /^Countdown/ })).toHaveValue("days");
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
  const rows = page
    .getByRole("region", { name: "Links to paste into OBS" })
    .locator(".editor-link");
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
  await page.goto("/editor");
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
  await expect(page).toHaveURL(/\/editor#1\./);
  await page.reload();
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Bookmarked title");
  await expect(page.getByRole("status").filter({ hasText: "Loaded!" })).toBeVisible();
});

test("autosave restores the last overlay when the editor opens without a link", async ({
  page,
}) => {
  await page.getByLabel("Title", { exact: true }).fill("Autosaved title");
  await page.goto("about:blank");
  await page.goto("/editor"); // "/" is always the landing page now (T6.67)
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
  await page.goto("/editor");
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
  await page.goto("/editor");
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

  const rows = page
    .getByRole("region", { name: "Links to paste into OBS" })
    .locator(".editor-link");
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
    await expect(tester(page).locator(".alert-title")).toHaveText(
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

test.describe("three-column shell on wide windows (T6.60)", () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
  });

  test("the section list jumps to each section and marks it, and the preview follows", async ({
    page,
  }) => {
    await expect(page.getByRole("navigation", { name: "Steps" })).toBeHidden();
    const list = page.getByRole("navigation", { name: "Sections" });
    await expect(list.getByRole("link")).toHaveText([
      "Look",
      "Text",
      "Socials",
      "Chat",
      "Alerts",
      "Logo",
      "Colors",
      "Links",
    ]);
    await list.getByRole("link", { name: "Chat" }).click();
    await expect(page.locator("#part-chat")).toBeFocused();
    await expect(list.getByRole("link", { name: "Chat" })).toHaveAttribute(
      "aria-current",
      "location",
    );
    await expect(page.locator(".editor-chat-preview")).toBeInViewport();
    await list.getByRole("link", { name: "Colors" }).click();
    await expect(page.getByLabel("Titles")).toBeVisible(); // the closed Advanced section opens
    await list.getByRole("link", { name: "Links" }).click();
    await expect(page.locator("#obs-links")).toBeFocused();
    await expect(page).toHaveURL(/\/editor#1\./); // jumping never replaces the settings in the address
    const scan = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(scan.violations).toEqual([]);
  });

  test("each section link marks that section, short ones included (T6.62)", async ({ page }) => {
    await page.getByRole("button", { name: "Add a social" }).click(); // a short Socials section
    const list = page.getByRole("navigation", { name: "Sections" });
    for (const name of ["Text", "Socials", "Chat", "Alerts", "Logo", "Colors", "Links", "Look"]) {
      await list.getByRole("link", { name }).click();
      await expect(list.locator('[aria-current="location"]'), name).toHaveText(name);
    }
    await list.getByRole("link", { name: "Socials" }).click();
    // The preview follows: Socials shows the scene, not the chat preview.
    await expect(preview(page).locator(".scene")).toBeInViewport();
  });

  test("the preview sits between the section list and the settings", async ({ page }) => {
    const x = async (sel: string) => (await page.locator(sel).first().boundingBox())!.x;
    expect(await x(".editor-rail")).toBeLessThan(await x(".editor-side"));
    expect(await x(".editor-side")).toBeLessThan(await x(".editor-form"));
  });
});

test("look filters show only that group, with the names under each card (T6.60)", async ({
  page,
}) => {
  const filters = page.getByRole("group", { name: "Show looks" });
  await filters.getByRole("button", { name: "Retro" }).click();
  await expect(filters.getByRole("button", { name: "Retro" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator(".editor-themes .editor-card:visible .editor-card-name")).toHaveText([
    "Arcade 8-Bit",
    "Vaporwave Sunset",
  ]);
  await filters.getByRole("button", { name: "All" }).click();
  await expect(page.locator(".editor-themes .editor-card:visible")).toHaveCount(8);
});

test("colors show their hex value and the volume shows its number (T6.60)", async ({ page }) => {
  await page.getByText("Advanced: colors and fonts").click();
  await page.getByLabel("Titles").fill("#ff0000");
  await expect(
    page.locator(".editor-color", { hasText: "Titles" }).locator(".editor-hex"),
  ).toHaveText("#FF0000");
  const volume = page.getByLabel("Alert volume");
  await volume.fill("40");
  await expect(page.locator(".editor-slider output")).toHaveText("40%");
});

test("each link shows its size as chips (T6.60)", async ({ page }) => {
  const chat = page.locator("#obs-links .editor-link", { hasText: "Chat" });
  await expect(chat.locator(".editor-chip")).toHaveText(["Width 400", "Height 600"]);
});

test("the alert preview crops to the card, with no empty box under it (T6.63)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const region = page.getByRole("region", { name: "Preview: Alerts" });
  const frame = region.locator(".editor-preview");
  await expect(region.locator(".alert-box")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
  const gap = async () => {
    const f = (await frame.boundingBox())!;
    const b = (await region.locator(".alert-box").boundingBox())!;
    return { below: f.y + f.height - (b.y + b.height), height: f.height, width: f.width };
  };
  const still = await gap();
  expect(still.height).toBeLessThan(still.width * 0.3); // not a 16:9 box
  expect(still.below).toBeGreaterThan(0); // the whole card shows
  // A longer test alert grows the crop with it.
  await page.getByRole("button", { name: "Test resub" }).click();
  await expect(region.locator(".alert-message")).toBeVisible();
  await expect.poll(async () => (await gap()).below).toBeGreaterThan(0);
});

test("in the narrow settings column, a link's size chips sit together under its name (T6.64)", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const row = page.locator("#obs-links .editor-link", { hasText: "Starting Soon" });
  const name = (await row.locator("label > span > strong").first().boundingBox())!;
  const [width, height] = await row.locator(".editor-chip").all();
  const w = (await width!.boundingBox())!;
  const h = (await height!.boundingBox())!;
  expect(w.y).toBeGreaterThan(name.y + name.height - 2); // under the name
  expect(Math.abs(w.y - h.y)).toBeLessThan(2); // on one line together
  expect(Math.abs(w.x - name.x)).toBeLessThan(2); // lined up with the name
  // The text screen readers get is unchanged.
  await expect(row.locator("label > span").first()).toHaveText(
    "Starting Soon · Width 1920 · Height 1080",
  );
});

for (const width of [900, 1100, 1440]) {
  test(`at ${width}px the preview never covers the links (T6.66)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    const side = (await page.locator(".editor-side").boundingBox())!;
    for (const row of await page.locator("#obs-links .editor-link").all()) {
      const r = (await row.boundingBox())!;
      const overlaps =
        r.x < side.x + side.width &&
        r.x + r.width > side.x &&
        r.y < side.y + side.height &&
        r.y + r.height > side.y;
      expect(overlaps).toBe(false);
    }
    await page.getByRole("button", { name: "Copy Alerts link" }).click(); // reachable, not covered
  });
}

test("the editor says chat and alerts are Twitch only, and links never change (T6.69)", async ({
  page,
}) => {
  await expect(page.getByText("Chat and alerts work with Twitch only.")).toBeVisible();
  await expect(page.locator("#obs-links")).toContainText("Your links never change.");
});

test("Copy all links copies every link with its size, and marks them copied (T6.70)", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.getByRole("button", { name: "Copy all links" }).click();
  await expect(page.locator(".editor-copy-all [role=status]")).toHaveText(
    "Copied all 5 links with their sizes.",
  );
  const text = await page.evaluate(() => navigator.clipboard.readText());
  // Windows' clipboard turns line breaks into \r\n.
  expect(text).toMatch(/Starting Soon \(width 1920, height 1080\)\r?\n/);
  expect(text).toMatch(/Chat \(width 400, height 600\)\r?\n/);
  expect(text.match(/\/o\/(starting|brb|ending|chat|alerts)#1\./g)).toHaveLength(5);
  await expect(page.locator(".editor-links-progress")).toContainText("You’re set");
});

test("Copy my save link copies the editor link once something is made (T6.70)", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await expect(page.getByRole("button", { name: "Copy my save link" })).toHaveCount(0);
  await page.getByLabel("Title", { exact: true }).fill("Saved for later");
  await page.getByRole("button", { name: "Copy my save link" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Save link copied." })).toBeVisible();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  await page.goto("about:blank");
  await page.goto(link);
  await expect(page.getByLabel("Title", { exact: true })).toHaveValue("Saved for later");
});

test("the links section says what you need and how to paste into OBS (T6.71)", async ({ page }) => {
  const links = page.locator("#obs-links");
  await expect(links).toContainText("What you’ll need: OBS Studio or Streamlabs Desktop.");
  const help = links.locator("details", { hasText: "How to paste a link into OBS" });
  await expect(help).toHaveAttribute("open", ""); // open at first
  await expect(help.locator("li")).toHaveCount(4);
  await expect(help.getByRole("img", { name: /Control audio via OBS ticked/ })).toBeVisible();
  const scan = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .include("#obs-links")
    .analyze();
  expect(scan.violations).toEqual([]);
});
