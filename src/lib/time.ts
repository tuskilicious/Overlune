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
