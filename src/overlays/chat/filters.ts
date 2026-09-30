import type { Settings } from "../../settings/schema";
import type { TwitchEvent } from "../../twitch/parse";
import type { ChatMessage } from "./ChatView";

/** Older messages are dropped past this, so a busy chat never grows the page. */
export const MAX_MESSAGES = 50;

export type ChatFilters = Pick<Settings["chat"], "hideCommands" | "bots">;

/** The message list after one event: filters new chat, and removes deleted messages, timeouts, bans and /clear. */
export function applyEvent(
  messages: ChatMessage[],
  e: TwitchEvent,
  { hideCommands, bots }: ChatFilters,
  now = Date.now(),
): ChatMessage[] {
  switch (e.type) {
    case "chat":
      if (bots.includes(e.login)) return messages;
      if (hideCommands && e.text.trimStart().startsWith("!")) return messages;
      return [...messages.slice(1 - MAX_MESSAGES), { ...e, at: now }];
    case "clearmsg":
      return messages.filter((m) => m.id !== e.targetId);
    case "clearchat":
      return e.login === undefined ? [] : messages.filter((m) => m.login !== e.login);
    default:
      return messages;
  }
}

/** Drops messages older than `fadeAfter` seconds (0 keeps everything). Same list back when nothing expired. */
export function expire(messages: ChatMessage[], now: number, fadeAfter: number): ChatMessage[] {
  if (fadeAfter <= 0) return messages;
  const kept = messages.filter((m) => m.at === undefined || now - m.at < fadeAfter * 1000);
  return kept.length === messages.length ? messages : kept;
}

/** Editor text box → bot list. One name per line (commas and spaces work too); "@" dropped, bad names skipped. */
export function botsFromInput(text: string): string[] {
  const names = text
    .toLowerCase()
    .split(/[\s,]+/)
    .map((n) => n.replace(/^@/, ""))
    .filter((n) => /^[a-z0-9_]{1,25}$/.test(n));
  return [...new Set(names)].slice(0, 50);
}
