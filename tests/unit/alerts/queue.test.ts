import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AlertEvent } from "../../../src/alerts/events";
import { ALERT_MS, createAlertQueue, GAP_MS, MAX_QUEUE } from "../../../src/alerts/queue";

const alert = (n: number): AlertEvent => ({
  kind: "subgift",
  user: `user${n}`,
  amount: 1,
  message: "",
});

function setup(options?: Parameters<typeof createAlertQueue>[1]) {
  const shown: (string | null)[] = [];
  const queue = createAlertQueue((a) => shown.push(a && a.user), options);
  const current = () => shown.at(-1) ?? null;
  return { shown, queue, current };
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("alert queue", () => {
  it("plays 20 alerts that arrive at once one at a time, in order, each for the full time", () => {
    const { shown, queue, current } = setup();
    for (let i = 1; i <= 20; i++) queue.push(alert(i));

    for (let i = 1; i <= 20; i++) {
      expect(current()).toBe(`user${i}`);
      vi.advanceTimersByTime(ALERT_MS - 1);
      expect(current()).toBe(`user${i}`); // not cut short
      vi.advanceTimersByTime(1);
      expect(current()).toBeNull(); // gap: nothing showing
      vi.advanceTimersByTime(GAP_MS);
    }

    const alerts = shown.filter((s) => s !== null);
    expect(alerts).toEqual(Array.from({ length: 20 }, (_, i) => `user${i + 1}`));
    // Strictly alternating start/end: never two alerts at the same moment.
    shown.forEach((s, i) => expect(s === null).toBe(i % 2 === 1));
    expect(vi.getTimerCount()).toBe(0); // idle again after 20 × (5s + 0.5s)
  });

  it("shows an alert right away when idle, and makes a new one wait mid-show", () => {
    const { queue, current } = setup();
    queue.push(alert(1));
    expect(current()).toBe("user1");
    vi.advanceTimersByTime(2000);
    queue.push(alert(2));
    expect(current()).toBe("user1");
    vi.advanceTimersByTime(ALERT_MS - 2000 + GAP_MS);
    expect(current()).toBe("user2");
  });

  it("starts again immediately after going idle", () => {
    const { queue, current } = setup();
    queue.push(alert(1));
    vi.advanceTimersByTime(ALERT_MS + GAP_MS + 60_000);
    queue.push(alert(2));
    expect(current()).toBe("user2");
  });

  it(`drops and counts alerts past ${MAX_QUEUE} waiting, and still plays the ones in line`, () => {
    const { shown, queue } = setup();
    let dropped = 0;
    // 1 showing + MAX_QUEUE waiting fit; 5 more are dropped.
    for (let i = 1; i <= MAX_QUEUE + 6; i++) dropped = queue.push(alert(i));
    expect(dropped).toBe(5);

    vi.advanceTimersByTime((MAX_QUEUE + 6) * (ALERT_MS + GAP_MS));
    const alerts = shown.filter((s) => s !== null);
    expect(alerts).toHaveLength(MAX_QUEUE + 1);
    expect(alerts.at(-1)).toBe(`user${MAX_QUEUE + 1}`);
  });

  it("stop() cancels the current alert's timer and the line", () => {
    const { shown, queue } = setup();
    queue.push(alert(1));
    queue.push(alert(2));
    queue.stop();
    vi.advanceTimersByTime(60_000);
    expect(shown).toEqual(["user1"]);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("uses custom timing and length", () => {
    const { shown, queue, current } = setup({ durationMs: 100, gapMs: 10, maxQueue: 1 });
    queue.push(alert(1));
    queue.push(alert(2));
    expect(queue.push(alert(3))).toBe(1);
    vi.advanceTimersByTime(110);
    expect(current()).toBe("user2");
    vi.advanceTimersByTime(110);
    expect(shown).toEqual(["user1", null, "user2", null]);
  });
});
