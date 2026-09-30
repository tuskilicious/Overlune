import type { AlertEvent } from "./events";

export const ALERT_MS = 5000;
/** Pause between alerts so two never blur into one. */
export const GAP_MS = 500;
/** Alerts waiting in line (~2.5 min of backlog). Extras are dropped; gift bombs are already one alert (events.ts). */
export const MAX_QUEUE = 30;

export interface QueueOptions {
  durationMs?: number;
  gapMs?: number;
  maxQueue?: number;
}

/**
 * Plays alerts one at a time, in arrival order. `onChange(alert)` when one starts, `onChange(null)` when it ends.
 * `push` returns how many alerts have been dropped so far because the line was full.
 */
export function createAlertQueue(
  onChange: (alert: AlertEvent | null) => void,
  { durationMs = ALERT_MS, gapMs = GAP_MS, maxQueue = MAX_QUEUE }: QueueOptions = {},
) {
  const waiting: AlertEvent[] = [];
  let busy = false;
  let dropped = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;

  const next = () => {
    const alert = waiting.shift();
    if (!alert) {
      busy = false;
      return;
    }
    busy = true;
    onChange(alert);
    timer = setTimeout(() => {
      onChange(null);
      timer = setTimeout(next, gapMs);
    }, durationMs);
  };

  return {
    push(alert: AlertEvent): number {
      if (waiting.length >= maxQueue) dropped++;
      else waiting.push(alert);
      if (!busy) next();
      return dropped;
    },
    stop() {
      clearTimeout(timer);
      waiting.length = 0;
      busy = false;
    },
  };
}
