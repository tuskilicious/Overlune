import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  connectChat,
  IDLE_TIMEOUT_MS,
  IRC_URL,
  JOIN_TIMEOUT_MS,
  normalizeChannel,
  type ChatStatus,
  type SocketLike,
} from "../../../src/twitch/irc";
import type { TwitchEvent } from "../../../src/twitch/parse";

class FakeSocket implements SocketLike {
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  constructor(public url: string) {}
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
  receive(data: string) {
    this.onmessage?.({ data });
  }
}

const ROOMSTATE = "@room-id=1;slow=0 :tmi.twitch.tv ROOMSTATE #dallas";
const CHAT = "@id=m1;display-name=a :a!a@a.tmi.twitch.tv PRIVMSG #dallas :hi";

function setup(channel = "Dallas") {
  const sockets: FakeSocket[] = [];
  const statuses: ChatStatus[] = [];
  const events: TwitchEvent[] = [];
  const stop = connectChat(channel, {
    onEvent: (e) => events.push(e),
    onStatus: (s) => statuses.push(s),
    createSocket: (url) => {
      const s = new FakeSocket(url);
      sockets.push(s);
      return s;
    },
  });
  const last = () => sockets[sockets.length - 1]!;
  return { sockets, statuses, events, stop, last };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(Math, "random").mockReturnValue(0.5); // no jitter: backoff is exactly 1s, 2s, 4s …
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("connectChat", () => {
  it("logs in anonymously and joins the lowercase channel", () => {
    const { last, statuses } = setup();
    last().onopen?.();
    expect(last().url).toBe(IRC_URL);
    expect(last().sent).toEqual([
      "CAP REQ :twitch.tv/tags twitch.tv/commands",
      expect.stringMatching(/^NICK justinfan\d+$/),
      "JOIN #dallas",
    ]);
    expect(last().sent.join("\n")).not.toMatch(/PASS|oauth/i);
    expect(statuses).toEqual(["connecting"]);
  });

  it("is connected once Twitch confirms the join, and forwards events", () => {
    const { last, statuses, events } = setup();
    last().onopen?.();
    last().receive(`${ROOMSTATE}\r\n${CHAT}\r\n`);
    expect(statuses).toEqual(["connecting", "connected"]);
    expect(events.map((e) => e.type)).toEqual(["unknown", "chat"]);
  });

  it("answers PING with PONG and does not forward it", () => {
    const { last, events } = setup();
    last().onopen?.();
    last().receive("PING :tmi.twitch.tv\r\n");
    expect(last().sent.at(-1)).toBe("PONG :tmi.twitch.tv");
    expect(events).toEqual([]);
  });

  it("reconnects with growing delays and resets after a good connection", () => {
    const { sockets, last, statuses } = setup();
    last().onclose?.();
    expect(statuses.at(-1)).toBe("reconnecting");

    vi.advanceTimersByTime(999);
    expect(sockets).toHaveLength(1);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(2); // after 1s

    last().onerror?.();
    vi.advanceTimersByTime(1999);
    expect(sockets).toHaveLength(2);
    vi.advanceTimersByTime(1);
    expect(sockets).toHaveLength(3); // after 2s

    last().onopen?.();
    last().receive(ROOMSTATE);
    expect(statuses.at(-1)).toBe("connected");
    last().onclose?.();
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(4); // back to 1s
  });

  it("shows the error state after repeated failures but keeps retrying", () => {
    const { sockets, last, statuses } = setup();
    for (let i = 0; i < 4; i++) {
      last().onclose?.();
      vi.advanceTimersByTime(30_000);
    }
    expect(statuses).toEqual(["connecting", "reconnecting", "error"]);
    expect(sockets).toHaveLength(5);
    last().onopen?.();
    last().receive(ROOMSTATE);
    expect(statuses.at(-1)).toBe("connected");
  });

  it("shows the error state when the channel never answers the join", () => {
    const { last, statuses, sockets } = setup("nosuchchannel");
    last().onopen?.();
    vi.advanceTimersByTime(JOIN_TIMEOUT_MS);
    expect(statuses.at(-1)).toBe("error");
    expect(sockets[0]!.closed).toBe(true);
  });

  it("reconnects when Twitch sends RECONNECT", () => {
    const { sockets, last } = setup();
    last().onopen?.();
    last().receive(ROOMSTATE);
    last().receive(":tmi.twitch.tv RECONNECT");
    expect(sockets[0]!.closed).toBe(true);
    vi.advanceTimersByTime(1000);
    expect(sockets).toHaveLength(2);
  });

  it("reconnects when the socket goes silent", () => {
    const { sockets, last } = setup();
    last().onopen?.();
    last().receive(ROOMSTATE);
    vi.advanceTimersByTime(IDLE_TIMEOUT_MS + 1000);
    expect(sockets).toHaveLength(2);
  });

  it("opens no socket for a name that can't be a channel", () => {
    const { sockets, statuses } = setup("not a channel!");
    expect(sockets).toHaveLength(0);
    expect(statuses).toEqual(["bad-channel"]);
  });

  it("stop() closes the socket and cancels retries", () => {
    const { sockets, last, stop } = setup();
    last().onclose?.();
    stop();
    vi.advanceTimersByTime(60_000);
    expect(sockets).toHaveLength(1);

    const second = setup();
    second.last().onopen?.();
    second.stop();
    expect(second.last().closed).toBe(true);
    vi.advanceTimersByTime(JOIN_TIMEOUT_MS + IDLE_TIMEOUT_MS);
    expect(second.sockets).toHaveLength(1);
  });
});

describe("normalizeChannel", () => {
  it.each([
    ["Dallas", "dallas"],
    ["  #dallas ", "dallas"],
    ["some_user123", "some_user123"],
    ["", null],
    ["two words", null],
    ["a".repeat(26), null],
    ["twitch.tv/dallas", null],
  ])("%j → %j", (raw, expected) => {
    expect(normalizeChannel(raw)).toBe(expected);
  });
});
