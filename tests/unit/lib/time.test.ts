import { describe, expect, it } from "vitest";
import {
  formatCountdown,
  formatEndTime,
  formatStartsAt,
  fromZoneInput,
  secondsLeft,
  toZoneInput,
} from "../../../src/lib/time";

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
    [86399, "23:59:59"],
    [86400, "1d 0h 0m"],
    [37 * 3600 + 59 * 60 + 55, "1d 13h 59m"],
    [3 * 86400 + 5 * 3600 + 7 * 60 + 30, "3d 5h 7m"],
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

describe("formatStartsAt names the day in the streamer's zone", () => {
  // `end` is Thu 1 Oct 2026, 8:00 PM in Kolkata (GMT+5:30).
  const kolkata = "Asia/Kolkata";
  const h = 3600_000;

  it("leaves the day out when the stream starts today", () => {
    expect(formatStartsAt(end, kolkata, end - 3 * h)).toBe("Starts at 8:00 PM GMT+5:30");
  });

  it("says tomorrow when it starts the next calendar day", () => {
    expect(formatStartsAt(end, kolkata, end - 24 * h)).toBe("Starts tomorrow, 8:00 PM GMT+5:30");
  });

  it("names the date from 2 days out", () => {
    expect(formatStartsAt(end + 48 * h, kolkata, end)).toBe("Starts Sat 3 Oct, 8:00 PM GMT+5:30");
  });

  it("counts calendar days in the streamer's zone, not hours or UTC", () => {
    // 11:59 PM → 12:01 AM in Kolkata is 2 minutes away but tomorrow.
    const late = fromZoneInput("2026-10-01T23:59", kolkata)!;
    const early = fromZoneInput("2026-10-02T00:01", kolkata)!;
    expect(formatStartsAt(early, kolkata, late)).toBe("Starts tomorrow, 12:01 AM GMT+5:30");
    // 12:01 AM → 11:59 PM the same day is almost 24 hours away but still today.
    const dayEnd = fromZoneInput("2026-10-02T23:59", kolkata)!;
    expect(formatStartsAt(dayEnd, kolkata, early)).toBe("Starts at 11:59 PM GMT+5:30");
    // The same two instants in UTC are 6:31 PM Thu → 6:29 PM Fri: the zone decides the day.
    expect(formatStartsAt(dayEnd, "UTC", early)).toBe("Starts tomorrow, 6:29 PM UTC");
  });

  it("handles the day the clocks change", () => {
    // London springs forward at 1:00 AM on Sun 29 Mar 2026, so that day is only 23 hours long.
    const london = "Europe/London";
    const sat = fromZoneInput("2026-03-28T23:30", london)!;
    const sunMorning = fromZoneInput("2026-03-29T09:00", london)!;
    const monMorning = fromZoneInput("2026-03-30T00:30", london)!;
    expect(formatStartsAt(sunMorning, london, sat)).toBe("Starts tomorrow, 9:00 AM GMT+1");
    expect(formatStartsAt(monMorning, london, sat)).toBe("Starts Mon 30 Mar, 12:30 AM GMT+1");
  });
});

describe("datetime-local ⇄ instant in a time zone", () => {
  it("reads the input as wall-clock time in the chosen zone", () => {
    expect(fromZoneInput("2026-10-01T20:00", "Asia/Kolkata")).toBe(Date.UTC(2026, 9, 1, 14, 30));
    expect(fromZoneInput("2026-10-01T14:30", "UTC")).toBe(Date.UTC(2026, 9, 1, 14, 30));
  });

  it("round-trips, including on both sides of a DST switch", () => {
    for (const v of ["2026-03-28T23:30", "2026-03-29T03:30", "2026-10-25T04:00"])
      expect(toZoneInput(fromZoneInput(v, "Europe/London")!, "Europe/London")).toBe(v);
  });

  it("shows an instant in the chosen zone", () => {
    expect(toZoneInput(end, "America/New_York")).toBe("2026-10-01T10:30");
  });

  it("rejects empty or broken input", () => {
    expect(fromZoneInput("", "UTC")).toBeNull();
    expect(fromZoneInput("2026-13-40T99:00", "UTC")).toBeNull();
  });
});
