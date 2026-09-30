import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { contrast, readableOn } from "../../../src/lib/contrast";
import ChatView, { type ChatMessage } from "../../../src/overlays/chat/ChatView";
import { defaultSettings } from "../../../src/settings/schema";
import { cleanSlate } from "../../../src/themes/clean-slate";
import { parseLine } from "../../../src/twitch/parse";

const chat = (line: string) => parseLine(line) as ChatMessage;
const render = (messages: ChatMessage[]) =>
  renderToStaticMarkup(createElement(ChatView, { settings: defaultSettings, messages }));

describe("ChatView", () => {
  it("renders hostile chat text as text, never as HTML", () => {
    const html = render([
      chat(
        '@id=1;display-name=<b>x</b> :evil!evil@evil.tmi.twitch.tv PRIVMSG #c :<img src=x onerror="alert(1)"> Kappa',
      ),
    ]);
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain("<b>");
    expect(html).toContain("&lt;img src=x onerror=");
  });

  it("renders emotes as images with the emote name as alt text", () => {
    const html = render([chat("@id=1;emotes=25:3-7 :a!a@a.tmi.twitch.tv PRIVMSG #c :hi Kappa")]);
    expect(html).toContain(
      'src="https://static-cdn.jtvnw.net/emoticons/v2/25/default/dark/2.0" alt="Kappa"',
    );
  });

  it("shows theme badges for roles, in a fixed order", () => {
    const html = render([
      chat("@id=1;badges=subscriber/12,vip/1,broadcaster/1 :a!a@a.tmi.twitch.tv PRIVMSG #c :hello"),
    ]);
    const labels = [...html.matchAll(/class="chat-badge"[^>]*>([^<]+)</g)].map((m) => m[1]);
    expect(labels).toEqual(["Streamer", "VIP", "Sub"]);
  });
});

describe("readableOn (name colors)", () => {
  const { surface, text } = cleanSlate;

  it("keeps a color that is already readable", () => {
    expect(readableOn("#FF7F50", surface, text)).toBe("#FF7F50");
  });

  it.each(["#0000FF", "#000000", "#1C1F26", "#8A2BE2"])("lightens %s until it reads at AA", (c) => {
    const out = readableOn(c, surface, text);
    expect(contrast(out, surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to the text color for anything that isn't #rrggbb", () => {
    expect(readableOn("red", surface, text)).toBe(text);
  });
});
