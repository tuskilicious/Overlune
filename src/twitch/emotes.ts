import type { EmoteRange } from "./parse";

/** Twitch emote CDN (no auth). 2.0 = 56px, sharp at 1080p. Ids are checked in parse.ts. */
export const emoteUrl = (id: string) =>
  `https://static-cdn.jtvnw.net/emoticons/v2/${encodeURIComponent(id)}/default/dark/2.0`;

export type MessagePart = { text: string } | { emoteId: string; name: string };

/** Cuts a message into text and emote parts. Positions are code points; bad or overlapping ranges are skipped. */
export function splitMessage(text: string, emotes: EmoteRange[]): MessagePart[] {
  const chars = Array.from(text);
  const parts: MessagePart[] = [];
  let at = 0;
  for (const { id, start, end } of emotes) {
    if (start < at || end >= chars.length) continue;
    if (start > at) parts.push({ text: chars.slice(at, start).join("") });
    parts.push({ emoteId: id, name: chars.slice(start, end + 1).join("") });
    at = end + 1;
  }
  if (at < chars.length) parts.push({ text: chars.slice(at).join("") });
  return parts;
}
