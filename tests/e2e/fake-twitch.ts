import { expect, type Page, type WebSocketRoute } from "@playwright/test";

// A fake Twitch IRC server for end-to-end tests (page.routeWebSocket): no real network.

export const priv = (id: string, login: string, text: string, tags = "") =>
  `@id=${id};display-name=${login}${tags} :${login}!${login}@${login}.tmi.twitch.tv PRIVMSG #dallas :${text}`;

export const ROOMSTATE = "@room-id=1 :tmi.twitch.tv ROOMSTATE #dallas";

/** Fake irc-ws.chat.twitch.tv. Answers JOIN with ROOMSTATE unless `silent` (how Twitch treats a missing channel). */
export async function fakeTwitch(page: Page, { silent = false } = {}) {
  const sockets: WebSocketRoute[] = [];
  const received: string[] = [];
  await page.routeWebSocket(/irc-ws\.chat\.twitch\.tv/, (ws) => {
    sockets.push(ws);
    ws.onMessage((m) => {
      const line = String(m);
      received.push(line);
      if (line.startsWith("JOIN ") && !silent) ws.send(ROOMSTATE);
    });
  });
  // Emote images: a local stand-in, so tests never reach the Twitch CDN.
  await page.route(/static-cdn\.jtvnw\.net/, (r) =>
    r.fulfill({
      contentType: "image/svg+xml",
      body: "<svg xmlns='http://www.w3.org/2000/svg' width='28' height='28'/>",
    }),
  );
  const joins = () => received.filter((l) => l.startsWith("JOIN ")).length;
  return {
    sockets,
    received,
    joins,
    /** Sends lines on the newest connection, once the page has joined. */
    send: async (...lines: string[]) => {
      await expect.poll(joins).toBeGreaterThan(0);
      sockets[sockets.length - 1]!.send(lines.join("\r\n"));
    },
  };
}
