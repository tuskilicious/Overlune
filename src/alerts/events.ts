import type { TwitchEvent } from "../twitch/parse";

// Parsed Twitch events → the alerts v1 supports. Follows and donations need a login (v2, out of scope).

export type AlertKind = "raid" | "sub" | "resub" | "subgift" | "bits";

export interface AlertEvent {
  kind: AlertKind;
  /** Display name of whoever caused the alert (raider, subscriber, gifter, cheerer). */
  user: string;
  /** Raid viewers, sub months, number of gifted subs, or bits. */
  amount: number;
  /** Resub message or cheer text; "" when there is none. */
  message: string;
}

/** Twitch's stand-in login for gifts from someone who chose to stay anonymous. */
const ANONYMOUS_GIFTER = "ananonymousgifter";

/** Gift bombs remembered at once. Far more than can overlap in one channel. */
const MAX_GIFT_IDS = 20;

/**
 * Returns a mapper from Twitch events to alerts, or null for events that don't alert.
 * It remembers recent gift bombs so "X is gifting 20 subs" is one alert, not 21.
 */
export function createAlertMapper() {
  const giftIds: string[] = [];

  return function toAlert(e: TwitchEvent): AlertEvent | null {
    if (e.type === "chat") {
      return e.bits > 0
        ? { kind: "bits", user: e.displayName, amount: e.bits, message: e.text }
        : null;
    }
    if (e.type !== "usernotice") return null;

    const user = e.login === ANONYMOUS_GIFTER ? "Anonymous" : e.displayName;
    switch (e.kind) {
      case "raid":
        return { kind: "raid", user, amount: e.viewers, message: "" };
      case "sub":
        return { kind: "sub", user, amount: Math.max(1, e.months), message: "" };
      case "resub":
        return { kind: "resub", user, amount: e.months, message: e.text };
      case "giftbomb":
        if (e.giftId) {
          giftIds.push(e.giftId);
          if (giftIds.length > MAX_GIFT_IDS) giftIds.shift();
        }
        return { kind: "subgift", user, amount: Math.max(1, e.giftCount), message: "" };
      case "subgift":
        // Part of a gift bomb that already alerted.
        if (e.giftId && giftIds.includes(e.giftId)) return null;
        return { kind: "subgift", user, amount: 1, message: "" };
      default:
        return null;
    }
  };
}
