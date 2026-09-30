/** Whole seconds until `endsAt`, rounded up so "00:01" shows until time is really up. Never negative. */
export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** 754 → "12:34", 3754 → "1:02:34". Hours keep counting past 24. */
export function formatCountdown(total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

/** End time in the streamer's time zone, with the zone shown: "8:00 PM GMT+5:30". */
export function formatEndTime(endsAt: number, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
    timeZoneName: "short",
  }).format(endsAt);
}

/** The wall-clock time `tz` shows at instant `ms`, expressed as if it were UTC. Drops milliseconds. */
function wallClock(ms: number, tz: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(ms)
      .map((x) => [x.type, Number(x.value)]),
  ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
}

/** Instant → `<input type="datetime-local">` value in `tz`: "2026-10-01T20:00". */
export function toZoneInput(ms: number, tz: string): string {
  return new Date(wallClock(ms, tz)).toISOString().slice(0, 16);
}

/** `<input type="datetime-local">` value read as wall-clock time in `tz` → instant. null if empty or invalid. */
export function fromZoneInput(value: string, tz: string): number | null {
  const guess = Date.parse(`${value}Z`);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || Number.isNaN(guess)) return null;
  // Two passes so the offset is taken at the result, not the guess (matters next to a DST switch).
  const first = guess - (wallClock(guess, tz) - guess);
  return guess - (wallClock(first, tz) - first);
}
