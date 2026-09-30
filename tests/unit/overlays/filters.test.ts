import { describe, expect, it } from "vitest";
import {
  applyEvent,
  botsFromInput,
  expire,
  MAX_MESSAGES,
  type ChatFilters,
} from "../../../src/overlays/chat/filters";
import type { ChatMessage } from "../../../src/overlays/chat/ChatView";
import { parseLine } from "../../../src/twitch/parse";

const msg = (id: string, login: string, text: string) =>
  parseLine(
    `@id=${id};display-name=${login} :${login}!${login}@${login}.tmi.twitch.tv PRIVMSG #c :${text}`,
  ) as ChatMessage;
const on: ChatFilters = { hideCommands: true, bots: ["nightbot"] };
const off: ChatFilters = { hideCommands: false, bots: [] };
const feed = (lines: string[], f = on) =>
  lines.map(parseLine).reduce((m, e) => applyEvent(m, e, f), [] as ChatMessage[]);
const priv = (id: string, login: string, text: string) =>
  `@id=${id};display-name=${login} :${login}!${login}@${login}.tmi.twitch.tv PRIVMSG #c :${text}`;

describe("applyEvent", () => {
  it("adds normal messages", () => {
    expect(feed([priv("1", "a", "hi")]).map((m) => m.id)).toEqual(["1"]);
  });

  it("hides bots on the list, whatever the display name's case", () => {
    const line =
      "@id=1;display-name=Nightbot :nightbot!nightbot@nightbot.tmi.twitch.tv PRIVMSG #c :hi";
    expect(feed([line])).toEqual([]);
    expect(feed([line], off)).toHaveLength(1);
  });

  it("hides !commands only when the filter is on", () => {
    const lines = [priv("1", "a", "!discord"), priv("2", "a", "  !uptime"), priv("3", "a", "hi!")];
    expect(feed(lines).map((m) => m.id)).toEqual(["3"]);
    expect(feed(lines, off)).toHaveLength(3);
  });

  it("removes a deleted message", () => {
    const m = feed([
      priv("1", "a", "keep"),
      priv("2", "b", "delete me"),
      "@login=b;target-msg-id=2 :tmi.twitch.tv CLEARMSG #c :delete me",
    ]);
    expect(m.map((x) => x.id)).toEqual(["1"]);
  });

  it("removes every message from a timed-out or banned user", () => {
    const m = feed([
      priv("1", "bad", "x"),
      priv("2", "a", "keep"),
      priv("3", "bad", "y"),
      "@ban-duration=600;target-user-id=9 :tmi.twitch.tv CLEARCHAT #c :bad",
    ]);
    expect(m.map((x) => x.id)).toEqual(["2"]);
  });

  it("empties the chat on /clear", () => {
    expect(feed([priv("1", "a", "x"), ":tmi.twitch.tv CLEARCHAT #c"])).toEqual([]);
  });

  it("keeps only the newest messages", () => {
    const lines = Array.from({ length: MAX_MESSAGES + 5 }, (_, i) => priv(`${i}`, "a", "hi"));
    const m = feed(lines);
    expect(m).toHaveLength(MAX_MESSAGES);
    expect(m[0]!.id).toBe("5");
  });

  it("returns the same list for events that don't change it", () => {
    const list = [msg("1", "a", "hi")];
    expect(applyEvent(list, parseLine("PING :x"), on)).toBe(list);
  });
});

describe("botsFromInput", () => {
  it("reads one name per line, commas or spaces, and cleans them up", () => {
    expect(botsFromInput("Nightbot\n@StreamElements, moobot  \n\nbad-name\nnightbot")).toEqual([
      "nightbot",
      "streamelements",
      "moobot",
    ]);
  });

  it("caps the list at 50", () => {
    expect(botsFromInput(Array.from({ length: 60 }, (_, i) => `b${i}`).join("\n"))).toHaveLength(
      50,
    );
  });
});

describe("fade-out", () => {
  it("records when each message arrived", () => {
    const [m] = applyEvent([], parseLine(priv("1", "a", "hi")), on, 1234);
    expect(m!.at).toBe(1234);
  });

  it("drops only messages older than the fade time", () => {
    const list = [
      { ...msg("old", "a", "x"), at: 0 },
      { ...msg("new", "a", "y"), at: 20_000 },
    ];
    expect(expire(list, 30_000, 15).map((m) => m.id)).toEqual(["new"]);
  });

  it("keeps everything when fade is off, and returns the same list when nothing expired", () => {
    const list = [{ ...msg("1", "a", "x"), at: 0 }];
    expect(expire(list, 1e9, 0)).toBe(list);
    expect(expire(list, 1000, 15)).toBe(list);
  });
});
