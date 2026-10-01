/** Whole seconds until `endsAt`, rounded up so "00:01" shows until time is really up. Never negative. */
export function secondsLeft(endsAt: number, now: number): number {
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

/** 754 → "12:34", 3754 → "1:02:34". A day or more → "1d 13h 59m", so viewers don't read "37:59:55" as tonight. */
export function formatCountdown(total: number): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  if (total >= 86400) {
    const d = Math.floor(total / 86400);
    return `${d}d ${Math.floor((total % 86400) / 3600)}h ${Math.floor((total % 3600) / 60)}m`;
  }
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

/** Calendar day of instant `ms` in `tz`, as a day count. Only differences between two of these mean anything. */
const dayNumber = (ms: number, tz: string) => Math.floor(wallClock(ms, tz) / 86_400_000);

/**
 * The countdown's label, naming the day in the streamer's zone when it isn't today:
 * "Starts at 8:00 PM GMT+5:30", "Starts tomorrow, 8:00 PM GMT+5:30", "Starts Sat 3 Oct, 8:00 PM GMT+5:30".
 */
export function formatStartsAt(endsAt: number, tz: string, now: number): string {
  const time = formatEndTime(endsAt, tz);
  const days = dayNumber(endsAt, tz) - dayNumber(now, tz);
  if (days <= 0) return `Starts at ${time}`;
  if (days === 1) return `Starts tomorrow, ${time}`;
  const date = new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: tz,
  }).format(endsAt);
  return `Starts ${date}, ${time}`;
}

/** How long a repeating countdown shows its done text after the start time, before counting to the next stream. */
export const LIVE_WINDOW_MS = 2 * 3600_000;

/**
 * Start of the stream a repeating countdown points at: the latest start less than LIVE_WINDOW_MS ago,
 * otherwise the next one. Times are wall-clock in `tz`, so DST changes keep "8 PM" at 8 PM.
 * null when repeating is off or no weekdays are picked.
 */
export function nextRepeatStart(
  repeat: { mode: "off" | "daily" | "days"; days: readonly number[]; time: string },
  tz: string,
  now: number,
): number | null {
  if (repeat.mode === "off") return null;
  const today = wallClock(now, tz);
  // Yesterday (its window can run past midnight) through a week ahead covers every weekday.
  for (let d = -1; d <= 7; d++) {
    const day = new Date(today + d * 86_400_000);
    if (repeat.mode === "days" && !repeat.days.includes(day.getUTCDay())) continue;
    const start = fromZoneInput(`${day.toISOString().slice(0, 10)}T${repeat.time}`, tz);
    if (start !== null && start + LIVE_WINDOW_MS > now) return start;
  }
  return null;
}
