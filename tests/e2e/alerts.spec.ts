import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import alertsLink from "../fixtures/links/v1/alerts.json" with { type: "json" };
import { fakeTwitch, priv } from "./fake-twitch";

// The alerts overlay against the fake Twitch IRC server.

const link = (data: Record<string, unknown>, query = "") =>
  `/o/alerts${query}#1.${lz.compressToEncodedURIComponent(JSON.stringify(data))}`;
const notice = (tags: string, text = "") =>
  `@${tags} :tmi.twitch.tv USERNOTICE #dallas${text ? ` :${text}` : ""}`;
const raid = (name: string, viewers: number) =>
  notice(
    `display-name=${name};login=${name.toLowerCase()};msg-id=raid;msg-param-viewerCount=${viewers}`,
  );
const box = (page: Page) => page.locator(".alert-box");

test("a raid shows the raid alert with the name and viewer count", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }));
  await expect(box(page)).toHaveCount(0);
  await twitch.send(raid("FriendlyRaider", 15));
  await expect(box(page).locator(".alert-title")).toHaveText(
    "FriendlyRaider is raiding with 15 viewers!",
  );
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("a burst plays one alert at a time, in order", async ({ page }) => {
  await page.clock.install();
  const twitch = await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }));
  await twitch.send(
    raid("First", 2),
    priv("c1", "second", "cheer100 hi", ";bits=100"),
    notice("display-name=Third;login=third;msg-id=sub;msg-param-cumulative-months=1"),
  );
  await expect(box(page)).toHaveCount(1);
  await expect(box(page)).toContainText("First is raiding");
  await page.clock.runFor(5_500);
  await expect(box(page)).toHaveCount(1);
  await expect(box(page)).toContainText("second cheered 100 bits!");
  await expect(box(page)).toContainText("cheer100 hi");
  await page.clock.runFor(5_500);
  await expect(box(page).locator(".alert-title")).toHaveText("Third just subscribed!");
  await page.clock.runFor(5_000);
  await expect(box(page)).toHaveCount(0);
});

test("a gift bomb is one alert with the total", async ({ page }) => {
  await page.clock.install();
  const twitch = await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }));
  const gifts = ["A", "B", "C"].map((r, i) =>
    notice(
      `display-name=Gal;id=g${i};login=gal;msg-id=subgift;msg-param-recipient-display-name=${r};msg-param-community-gift-id=77`,
    ),
  );
  await twitch.send(
    notice(
      "display-name=Gal;id=b;login=gal;msg-id=submysterygift;msg-param-mass-gift-count=3;msg-param-community-gift-id=77",
    ),
    ...gifts,
  );
  await expect(box(page).locator(".alert-title")).toHaveText("Gal gifted 3 subs!");
  await page.clock.runFor(6_000);
  await expect(box(page)).toHaveCount(0);
});

test("custom templates are used, and names are shown as text", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(
    link({
      chat: { channel: "dallas" },
      alerts: { templates: { raid: "<b>{user}</b> +{amount}" } },
    }),
  );
  await twitch.send(raid("Raider", 7));
  await expect(box(page).locator(".alert-title")).toHaveText("<b>Raider</b> +7");
  await expect(box(page).locator("b")).toHaveCount(0);
});

test("?test=1 plays one sample of each alert, then goes quiet", async ({ page }) => {
  await page.clock.install();
  await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }, "?test=1"));
  const seen: string[] = [];
  for (let i = 0; i < 5; i++) {
    await expect(box(page)).toHaveCount(1);
    seen.push((await box(page).getAttribute("data-kind"))!);
    await page.clock.runFor(5_500);
  }
  expect(seen).toEqual(["raid", "sub", "resub", "subgift", "bits"]);
  await expect(box(page)).toHaveCount(0);
});

const testLabel = (page: Page) =>
  page.getByText(/^Test mode: switch back to your normal Alerts link/);

test("an old ?test=1 link with no expiry still plays its samples and shows the test label", async ({
  page,
}) => {
  await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }, "?test=1"));
  await expect(box(page)).toHaveAttribute("data-kind", "raid");
  await expect(testLabel(page)).toBeVisible();
});

test("a new test link plays its samples until it expires", async ({ page }) => {
  await fakeTwitch(page);
  const in15Minutes = Math.floor(Date.now() / 1000) + 15 * 60;
  await page.goto(link({ chat: { channel: "dallas" } }, `?test=1&until=${in15Minutes}`));
  await expect(box(page)).toHaveAttribute("data-kind", "raid");
  await expect(testLabel(page)).toBeVisible();
});

for (const [name, until] of [
  ["expired", Math.floor(Date.now() / 1000) - 60],
  ["broken", "soon"],
]) {
  test(`a ${name} test link plays nothing but keeps the label`, async ({ page }) => {
    await page.clock.install();
    await fakeTwitch(page);
    await page.goto(link({ chat: { channel: "dallas" } }, `?test=1&until=${until}`));
    await expect(testLabel(page)).toBeVisible();
    await page.clock.runFor(2_000);
    await expect(box(page)).toHaveCount(0);
  });
}

test("the normal Alerts link shows no test label", async ({ page }) => {
  await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }));
  await expect(page.locator(".alerts")).toBeVisible();
  await expect(testLabel(page)).toHaveCount(0);
});

test("asks for a channel name when the link has none", async ({ page }) => {
  await fakeTwitch(page);
  await page.goto(link({}));
  await expect(page.getByRole("status")).toContainText("Alerts need your channel name");
});

test("saved link still works: v1/alerts.json", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(alertsLink.link);
  await expect.poll(twitch.joins).toBe(1);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("each alert plays the theme sound, served from this site", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }));
  const sound = page.waitForResponse(/\/sounds\/clean-slate\.ogg$/);
  await twitch.send(raid("Raider", 3));
  const response = await sound;
  expect([200, 206]).toContain(response.status()); // media loads with range requests
  expect(response.headers()["content-type"]).toMatch(/ogg/);
});

test("volume 0 plays no sound", async ({ page }) => {
  const requests: string[] = [];
  page.on("request", (r) => requests.push(r.url()));
  const twitch = await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" }, alerts: { volume: 0 } }));
  await twitch.send(raid("Raider", 3));
  await expect(box(page)).toBeVisible();
  expect(requests.filter((u) => u.includes("/sounds/"))).toEqual([]);
});

test("alerts label the event above the message (T6.35)", async ({ page }) => {
  await page.goto(link({ chat: { channel: "dallas" } }, "?test=1"));
  await expect(box(page).locator(".alert-kind")).toHaveText("Raid");
  await expect(box(page).locator(".alert-kind")).toBeVisible();
});

test("an Arcade 8-Bit raid alert takes at most two lines (T6.55)", async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "reduce" }); // the stepped entrance scales the box while it plays
  await page.goto(link({ theme: "arcade-8bit", chat: { channel: "dallas" } }, "?test=1"));
  const title = box(page).locator(".alert-title");
  await expect(title).toHaveText("FriendlyRaider is raiding with 42 viewers!");
  await page.evaluate(() => document.fonts.ready);
  const lines = await title.evaluate(
    (el) => el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight),
  );
  expect(lines).toBeLessThan(2.5);
});

// T6.75: each alert stays as long as the link says; old links keep 5 seconds.
for (const [seconds, goneBy] of [
  [3, true],
  [undefined, false],
] as const) {
  test(`an alert set to ${seconds ?? "the default"} seconds is ${goneBy ? "gone" : "still there"} after 3.2s`, async ({
    page,
  }) => {
    // A paused fake clock: time only moves when the test says (an installed clock otherwise keeps ticking).
    const start = new Date("2026-10-03T12:00:00Z").getTime();
    await page.clock.install({ time: start });
    await page.clock.pauseAt(start + 1000);
    const alerts = seconds ? { seconds } : {};
    await page.goto(link({ chat: { channel: "dallas" }, alerts }, "?test=1"));
    // Step the fake clock until the first sample is on screen, then time it from there.
    await expect
      .poll(async () => {
        await page.clock.runFor(50);
        return box(page).count();
      })
      .toBe(1);
    await page.clock.runFor(3200);
    await expect(box(page)).toHaveCount(goneBy ? 0 : 1);
  });
}

test("each alert lands with a burst and a name pop, invisible at rest under reduced motion (T6.117)", async ({
  page,
}) => {
  await fakeTwitch(page);
  await page.goto(link({ chat: { channel: "dallas" } }, "?test=1"));
  await expect(page.locator(".alert-box")).toBeVisible();
  await expect(page.locator(".alert-burst")).toHaveCSS("animation-name", "alert-burst");
  await expect(page.locator(".alert-user")).toHaveCSS("animation-name", "alert-pop");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(link({ chat: { channel: "dallas" } }, "?test=1"));
  await expect(page.locator(".alert-box")).toBeVisible();
  await expect(page.locator(".alert-burst")).toHaveCSS("opacity", "0");
  await expect(page.locator(".alert-user")).toHaveCSS("opacity", "1");
});

test.describe("Clean Slate's alert lines follow the card in (T6.137)", () => {
  const titleOpacity = (page: Page) =>
    box(page)
      .locator(".alert-title")
      .evaluate((e) => Number(getComputedStyle(e).opacity));

  test("the lines fade up one after another, in CSS, and GSAP never loads", async ({ page }) => {
    const gsap: string[] = [];
    page.on("request", (r) => /gsap/.test(r.url()) && gsap.push(r.url()));
    const twitch = await fakeTwitch(page);
    await page.goto(link({ chat: { channel: "dallas" } }));
    await twitch.send(raid("Raider", 5));
    await expect.poll(() => titleOpacity(page), { intervals: [20] }).toBeLessThan(1);
    await expect.poll(() => titleOpacity(page)).toBe(1);
    await expect(box(page).locator(".alert-title")).toHaveCSS("animation-name", "alert-line-in");
    // The label goes first, then the title.
    await expect(box(page).locator(".alert-kind")).toHaveCSS("animation-delay", "0.15s");
    await expect(box(page).locator(".alert-title")).toHaveCSS("animation-delay", "0.23s");
    expect(gsap).toEqual([]);
  });

  test("with ?rm=1 the lines are simply there", async ({ page }) => {
    const twitch = await fakeTwitch(page);
    await page.goto(link({ chat: { channel: "dallas" } }, "?rm=1"));
    await twitch.send(raid("Raider", 5));
    await expect(box(page).locator(".alert-title")).toHaveCSS("animation-name", "none");
    expect(await titleOpacity(page)).toBe(1);
  });

  test("other looks keep their own alert", async ({ page }) => {
    const twitch = await fakeTwitch(page);
    await page.goto(link({ theme: "neon-grid", chat: { channel: "dallas" } }));
    await twitch.send(raid("Raider", 5));
    await expect(box(page)).toHaveCSS("animation-name", /alert-glitch/);
    await expect(box(page).locator(".alert-title")).toHaveCSS("animation-name", "none");
  });
});
