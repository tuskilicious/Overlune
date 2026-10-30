import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { followLive, MAX_WAIT_MS, PING_MS } from "../../../src/lib/live";

// The overlay's side of a saved overlay's live channel (T12.3), against a stand-in WebSocket. The channel itself runs
// for real in tests/functions/live.test.ts.

class FakeSocket {
  static all: FakeSocket[] = [];
  sent: string[] = [];
  closedWith: number | undefined;
  private listeners: Record<string, ((e: { data?: unknown }) => void)[]> = {};
  constructor(public url: string) {
    FakeSocket.all.push(this);
  }
  addEventListener(type: string, fn: (e: { data?: unknown }) => void) {
    (this.listeners[type] ??= []).push(fn);
  }
  send(data: string) {
    this.sent.push(data);
  }
  close(code?: number) {
    this.closedWith = code;
    this.emit("close");
  }
  emit(type: string, data?: unknown) {
    for (const fn of this.listeners[type] ?? []) fn({ data });
  }
}

const latest = () => FakeSocket.all.at(-1)!;
let got: [string, number][];
let stop: () => void;
/** What the channel's plain address answers, asked after a connection that never opened (T12.4). */
let status: number;
let asked: string[];
const follow = (random = () => 1) =>
  (stop = followLive("abc_123", (s, v) => got.push([s, v]), {
    origin: "https://overlune.in",
    WebSocketImpl: FakeSocket as unknown as typeof WebSocket,
    fetchImpl: async (url) => {
      asked.push(url);
      return { status };
    },
    random,
  }));

beforeEach(() => {
  vi.useFakeTimers();
  FakeSocket.all = [];
  got = [];
  status = 200;
  asked = [];
});
afterEach(() => {
  stop?.();
  vi.useRealTimers();
});

describe("followLive", () => {
  it("connects to the overlay's channel on the site it came from", () => {
    follow();
    expect(latest().url).toBe("wss://overlune.in/api/live/abc_123");
  });

  it("passes on each newer version, and nothing older, repeated or not its own", () => {
    follow();
    const ws = latest();
    ws.emit("open");
    ws.emit("message", JSON.stringify({ version: 3, settings: "1.three" }));
    ws.emit("message", JSON.stringify({ version: 3, settings: "1.again" }));
    ws.emit("message", JSON.stringify({ version: 2, settings: "1.older" }));
    for (const junk of ["pong", "{", "null", '{"version":"4","settings":"x"}', '{"version":5}'])
      ws.emit("message", junk);
    ws.emit("message", JSON.stringify({ version: 4, settings: "1.four" }));
    expect(got).toEqual([
      ["1.three", 3],
      ["1.four", 4],
    ]);
  });

  it("pings while open, and stops when the connection drops", () => {
    follow();
    const ws = latest();
    ws.emit("open");
    vi.advanceTimersByTime(PING_MS * 2);
    expect(ws.sent).toEqual(["ping", "ping"]);
    ws.emit("close");
    vi.advanceTimersByTime(PING_MS * 2);
    expect(ws.sent).toHaveLength(2);
  });

  it("reconnects after longer and longer waits, up to the most, and starts over once it works", async () => {
    follow();
    const waits = [1000, 2000, 4000, 8000, 16000, MAX_WAIT_MS, MAX_WAIT_MS];
    for (const wait of waits) {
      const count = FakeSocket.all.length;
      latest().emit("close");
      await vi.advanceTimersByTimeAsync(wait - 1);
      expect(FakeSocket.all, `before ${wait} ms`).toHaveLength(count);
      await vi.advanceTimersByTimeAsync(1);
      expect(FakeSocket.all, `at ${wait} ms`).toHaveLength(count + 1);
    }
    latest().emit("open");
    latest().emit("close");
    await vi.advanceTimersByTimeAsync(1000);
    expect(FakeSocket.all).toHaveLength(waits.length + 2);
  });

  it("spreads the waits out, at least half of each", async () => {
    follow(() => 0);
    latest().emit("close");
    await vi.advanceTimersByTimeAsync(499);
    expect(FakeSocket.all).toHaveLength(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("stops for good when a connection that never opened finds the overlay gone (404), and asks only then", async () => {
    follow();
    latest().emit("open");
    latest().emit("close");
    await vi.advanceTimersByTimeAsync(1000);
    expect(asked).toEqual([]);
    status = 404;
    latest().emit("close");
    await vi.advanceTimersByTimeAsync(MAX_WAIT_MS * 4);
    expect(asked).toEqual(["https://overlune.in/api/live/abc_123"]);
    expect(FakeSocket.all).toHaveLength(2);
  });

  it("closes for good when the overlay is deleted, keeping what it had", () => {
    follow();
    const ws = latest();
    ws.emit("open");
    ws.emit("message", JSON.stringify({ version: 1, settings: "1.one" }));
    ws.emit("message", JSON.stringify({ deleted: true }));
    expect(ws.closedWith).toBe(1000);
    vi.advanceTimersByTime(MAX_WAIT_MS * 4);
    expect(FakeSocket.all).toHaveLength(1);
    expect(got).toEqual([["1.one", 1]]);
  });

  it("stops when asked: closed, and no reconnect", () => {
    follow();
    latest().emit("open");
    stop();
    expect(latest().closedWith).toBe(1000);
    vi.advanceTimersByTime(MAX_WAIT_MS * 4);
    expect(FakeSocket.all).toHaveLength(1);
  });
});
