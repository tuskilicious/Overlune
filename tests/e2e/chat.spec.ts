import { expect, test, type Page } from "@playwright/test";
import lz from "lz-string";
import { fakeTwitch, priv } from "./fake-twitch";
import chatLink from "../fixtures/links/v1/chat.json" with { type: "json" };
import chatFiltersLink from "../fixtures/links/v1/chat-filters.json" with { type: "json" };
import chatOptionsLink from "../fixtures/links/v1/chat-options.json" with { type: "json" };

// The chat overlay against a fake Twitch IRC server (page.routeWebSocket): no real network.

const link = (chat: Record<string, unknown>, query = "") =>
  `/o/chat${query}#1.${lz.compressToEncodedURIComponent(JSON.stringify({ chat }))}`;

const messages = (page: Page) => page.locator(".chat-msg");

test("logs in anonymously, with no token", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "Dallas" }));
  await expect.poll(twitch.joins).toBe(1);
  expect(twitch.received[0]).toBe("CAP REQ :twitch.tv/tags twitch.tv/commands");
  expect(twitch.received[1]).toMatch(/^NICK justinfan\d+$/);
  expect(twitch.received[2]).toBe("JOIN #dallas");
  expect(twitch.received.join("\n")).not.toMatch(/PASS|oauth/i);
});

test("shows messages with names, badges, emotes and wrapping", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "dallas" }));
  await twitch.send(
    priv("1", "ronni", "hi Kappa", ";badges=moderator/1,subscriber/3;color=#FF7F50;emotes=25:3-7"),
    priv("2", "wordy", "a".repeat(300)),
  );
  await expect(messages(page)).toHaveCount(2);
  const first = messages(page).first();
  await expect(first).toContainText("Mod");
  await expect(first).toContainText("Sub");
  await expect(first).toContainText("ronni: hi");
  await expect(first.locator("img.chat-emote")).toHaveAttribute("alt", "Kappa");
  const box = await messages(page).nth(1).boundingBox();
  expect(box!.width).toBeLessThanOrEqual(400); // long words wrap inside the box
});

test("chat text is never run as HTML", async ({ page }) => {
  let dialog = false;
  page.on("dialog", (d) => {
    dialog = true;
    void d.dismiss();
  });
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "dallas" }));
  await twitch.send(priv("1", "evil", '<img src=x onerror="alert(1)"><b>bold</b>'));
  await expect(messages(page)).toContainText('<img src=x onerror="alert(1)"><b>bold</b>');
  await expect(messages(page).locator("b, img:not(.chat-emote)")).toHaveCount(0);
  expect(dialog).toBe(false);
});

test("answers PING with PONG", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "dallas" }));
  await twitch.send("PING :tmi.twitch.tv");
  await expect.poll(() => twitch.received).toContain("PONG :tmi.twitch.tv");
});

test("hides bots and !commands, and removes deleted, timed-out and cleared messages", async ({
  page,
}) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "dallas" }));
  await twitch.send(
    priv("1", "nightbot", "Follow the channel!"),
    priv("2", "a", "!discord"),
    priv("3", "a", "keep me"),
    priv("4", "b", "delete me"),
    priv("5", "troll", "spam"),
    priv("6", "troll", "more spam"),
  );
  await expect(messages(page)).toHaveText([/keep me/, /delete me/, /spam/, /more spam/]);

  await twitch.send("@login=b;target-msg-id=4 :tmi.twitch.tv CLEARMSG #dallas :delete me");
  await twitch.send("@ban-duration=600;target-user-id=9 :tmi.twitch.tv CLEARCHAT #dallas :troll");
  await expect(messages(page)).toHaveText([/keep me/]);

  await twitch.send(":tmi.twitch.tv CLEARCHAT #dallas");
  await expect(messages(page)).toHaveCount(0);
});

test("asks for a channel name when the link has none", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "" }));
  await expect(page.getByRole("status")).toContainText("Chat needs your channel name");
  expect(twitch.sockets).toHaveLength(0);
});

test("shows the can't-connect card when the channel never answers", async ({ page }) => {
  await page.clock.install();
  await fakeTwitch(page, { silent: true });
  await page.goto(link({ channel: "nosuchchannel" }));
  await expect(page.getByRole("status")).toHaveCount(0);
  await page.clock.runFor(10_000);
  await expect(page.getByRole("status")).toContainText("Can’t connect to chat");
});

test("reconnects and keeps showing chat after the connection drops", async ({ page }) => {
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "dallas" }));
  await twitch.send(priv("1", "a", "before"));
  await expect(messages(page)).toHaveCount(1);

  await twitch.sockets.at(-1)!.close(); // the live one (dev StrictMode opens and drops a first socket)
  await expect.poll(twitch.joins, { timeout: 5000 }).toBe(2);
  await twitch.send(priv("2", "a", "after"));
  await expect(messages(page)).toHaveText([/before/, /after/]);
  await expect(page.getByRole("status")).toHaveCount(0);
});

test("fade-out removes messages on time, also with reduced motion", async ({ page }) => {
  await page.clock.install();
  const twitch = await fakeTwitch(page);
  await page.goto(link({ channel: "dallas", fadeAfter: 15 }, "?rm=1"));
  await twitch.send(priv("1", "a", "short-lived"));
  await expect(messages(page)).toHaveCount(1);
  await page.clock.runFor(10_000);
  await expect(messages(page)).toHaveCount(1);
  await page.clock.runFor(6_000);
  await expect(messages(page)).toHaveCount(0);
});

for (const [name, fixture] of Object.entries({
  "v1/chat.json": chatLink,
  "v1/chat-filters.json": chatFiltersLink,
  "v1/chat-options.json": chatOptionsLink,
})) {
  test(`saved link still works: ${name}`, async ({ page }) => {
    const twitch = await fakeTwitch(page);
    await page.goto(fixture.link);
    await expect.poll(twitch.joins).toBe(1);
    expect(twitch.received).toContain("JOIN #tuskilicious");
    await expect(page.getByRole("status")).toHaveCount(0);
  });
}
