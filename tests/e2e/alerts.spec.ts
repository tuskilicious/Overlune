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
  await expect(box(page)).toHaveText("FriendlyRaider is raiding with 15 viewers!");
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
  await expect(box(page)).toHaveText("Third just subscribed!");
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
  await expect(box(page)).toHaveText("Gal gifted 3 subs!");
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
  await expect(box(page)).toHaveText("<b>Raider</b> +7");
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
