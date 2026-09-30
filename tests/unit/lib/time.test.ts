import { describe, expect, it } from "vitest";
import { formatCountdown, formatEndTime, secondsLeft } from "../../../src/lib/time";

const end = Date.UTC(2026, 9, 1, 14, 30); // 2026-10-01 14:30 UTC

describe("secondsLeft", () => {
  it("depends only on the fixed end time, so a reload gives the same answer", () => {
    expect(secondsLeft(end, end - 90_000)).toBe(90);
  });

  it("rounds up partial seconds", () => {
    expect(secondsLeft(end, end - 1)).toBe(1);
    expect(secondsLeft(end, end - 1500)).toBe(2);
  });

  it("is zero at and after the end", () => {
    expect(secondsLeft(end, end)).toBe(0);
    expect(secondsLeft(end, end + 60_000)).toBe(0);
  });
});

describe("formatCountdown", () => {
  it.each([
    [0, "00:00"],
    [5, "00:05"],
    [754, "12:34"],
    [3599, "59:59"],
    [3600, "1:00:00"],
    [3754, "1:02:34"],
    [26 * 3600, "26:00:00"],
  ])("%i → %s", (secs, text) => {
    expect(formatCountdown(secs)).toBe(text);
  });
});

describe("formatEndTime", () => {
  it("shows the time in the streamer's zone with the zone label", () => {
    expect(formatEndTime(end, "UTC")).toBe("2:30 PM UTC");
    expect(formatEndTime(end, "Asia/Kolkata")).toBe("8:00 PM GMT+5:30");
  });
});
