import { z } from "zod";

// Turns raw Twitch IRC lines into typed events. Every line is hostile input:
// parsing never throws, and anything malformed becomes { type: "unknown" }.

export type Badges = Record<string, string>;

/** Emote position in the message text. `start`/`end` are inclusive code-point indexes (Twitch counts code points, not UTF-16 units). */
export interface EmoteRange {
  id: string;
  start: number;
  end: number;
}

/** `giftbomb` is Twitch's `submysterygift`: "X is gifting N subs", followed by N `subgift` notices. */
export type SubKind = "sub" | "resub" | "subgift" | "giftbomb" | "raid" | "other";

export type TwitchEvent =
  | {
      type: "chat";
      id: string;
      channel: string;
      login: string;
      displayName: string;
      /** `#rrggbb`, or undefined when the user never picked one. */
      color?: string;
      badges: Badges;
      emotes: EmoteRange[];
      text: string;
      /** True for `/me` messages. */
      action: boolean;
      /** Bits cheered in this message, 0 if none. */
      bits: number;
    }
  | {
      type: "usernotice";
      kind: SubKind;
      /** Raw Twitch `msg-id`, kept for kinds we don't map yet. */
      msgId: string;
      channel: string;
      login: string;
      displayName: string;
      /** The optional message the user attached (resub message), or "". */
      text: string;
      /** Total months subscribed (sub/resub) or months gifted (subgift). */
      months: number;
      /** subgift only: who received the sub. */
      recipient?: string;
      /** raid only: how many viewers came along. */
      viewers: number;
      /** giftbomb only: how many subs are being gifted. */
      giftCount: number;
      /** giftbomb and the subgifts it causes share this id, so the gifts can be grouped. */
      giftId?: string;
    }
  | { type: "clearmsg"; channel: string; targetId: string }
  /** `login` set: one user was timed out or banned. Unset: the whole chat was cleared. */
  | { type: "clearchat"; channel: string; login?: string }
  | { type: "ping"; token: string }
  | { type: "unknown"; command: string };

interface RawLine {
  tags: Record<string, string>;
  prefix: string;
  command: string;
  params: string[];
}

const TAG_ESCAPES: Record<string, string> = { ":": ";", s: " ", "\\": "\\", r: "\r", n: "\n" };

const unescapeTag = (v: string) => v.replace(/\\(.?)/g, (_, c: string) => TAG_ESCAPES[c] ?? c);

/** Splits one IRC line into tags, prefix, command and params. Returns null if there is no command. */
export function splitLine(raw: string): RawLine | null {
  let rest = raw.replace(/[\r\n]+$/, "");
  const tags: Record<string, string> = {};
  let prefix = "";

  if (rest.startsWith("@")) {
    const end = rest.indexOf(" ");
    if (end < 0) return null;
    for (const pair of rest.slice(1, end).split(";")) {
      const eq = pair.indexOf("=");
      if (eq < 0) tags[pair] = "";
      else tags[pair.slice(0, eq)] = unescapeTag(pair.slice(eq + 1));
    }
    rest = rest.slice(end + 1).trimStart();
  }
  if (rest.startsWith(":")) {
    const end = rest.indexOf(" ");
    if (end < 0) return null;
    prefix = rest.slice(1, end);
    rest = rest.slice(end + 1).trimStart();
  }

  const trailingAt = rest.indexOf(" :");
  const head = trailingAt < 0 ? rest : rest.slice(0, trailingAt);
  const [command = "", ...params] = head.split(" ").filter(Boolean);
  if (trailingAt >= 0) params.push(rest.slice(trailingAt + 2));
  if (!command) return null;
  return { tags, prefix, command: command.toUpperCase(), params };
}

const count = z.coerce.number().int().nonnegative().catch(0);
const login = z.string().regex(/^[a-z0-9_]{1,25}$/);
const color = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/)
  .optional()
  .catch(undefined);
const emoteId = /^[A-Za-z0-9_]+$/;

/** `25:0-4,12-16/1902:6-10` → ranges sorted by start. Bad entries are dropped. */
export function parseEmotes(tag: string | undefined): EmoteRange[] {
  if (!tag) return [];
  const out: EmoteRange[] = [];
  for (const group of tag.split("/")) {
    const [id = "", positions = ""] = group.split(":");
    if (!emoteId.test(id)) continue;
    for (const pos of positions.split(",")) {
      const m = /^(\d+)-(\d+)$/.exec(pos);
      if (!m) continue;
      const start = Number(m[1]);
      const end = Number(m[2]);
      if (end >= start) out.push({ id, start, end });
    }
  }
  return out.sort((a, b) => a.start - b.start);
}

/** `broadcaster/1,subscriber/12` → { broadcaster: "1", subscriber: "12" }. */
export function parseBadges(tag: string | undefined): Badges {
  const out: Badges = {};
  if (!tag) return out;
  for (const b of tag.split(",")) {
    const [name, version = ""] = b.split("/");
    if (name) out[name] = version;
  }
  return out;
}

const channelOf = (p: string | undefined) => (p?.startsWith("#") ? p.slice(1) : undefined);

/** `/me` messages arrive wrapped as \x01ACTION ...\x01. */
const ACTION = "\u0001ACTION ";

const SUB_KINDS: Record<string, SubKind> = {
  sub: "sub",
  resub: "resub",
  subgift: "subgift",
  submysterygift: "giftbomb",
  raid: "raid",
};

function toEvent({ tags, prefix, command, params }: RawLine): TwitchEvent | null {
  const channel = channelOf(params[0]);
  switch (command) {
    case "PING":
      return { type: "ping", token: params[0] ?? "" };

    case "PRIVMSG": {
      const user = login.safeParse(prefix.split("!")[0]);
      const id = tags.id;
      if (!channel || !user.success || !id) return null;
      let text = params[1] ?? "";
      const action = text.startsWith(ACTION) && text.endsWith("\u0001");
      if (action) text = text.slice(ACTION.length, -1);
      return {
        type: "chat",
        id,
        channel,
        login: user.data,
        displayName: tags["display-name"] || user.data,
        color: color.parse(tags.color || undefined),
        badges: parseBadges(tags.badges),
        emotes: parseEmotes(tags.emotes),
        text,
        action,
        bits: count.parse(tags.bits),
      };
    }

    case "USERNOTICE": {
      const user = login.safeParse(tags.login);
      const msgId = tags["msg-id"];
      if (!channel || !user.success || !msgId) return null;
      const kind = SUB_KINDS[msgId] ?? "other";
      return {
        type: "usernotice",
        kind,
        msgId,
        channel,
        login: user.data,
        displayName: tags["display-name"] || user.data,
        text: params[1] ?? "",
        months: count.parse(
          kind === "subgift" ? tags["msg-param-months"] : tags["msg-param-cumulative-months"],
        ),
        recipient:
          kind === "subgift"
            ? tags["msg-param-recipient-display-name"] || tags["msg-param-recipient-user-name"]
            : undefined,
        viewers: count.parse(tags["msg-param-viewerCount"]),
        giftCount: count.parse(tags["msg-param-mass-gift-count"]),
        giftId: tags["msg-param-community-gift-id"]?.slice(0, 64) || undefined,
      };
    }

    case "CLEARMSG": {
      const targetId = tags["target-msg-id"];
      if (!channel || !targetId) return null;
      return { type: "clearmsg", channel, targetId };
    }

    case "CLEARCHAT": {
      if (!channel) return null;
      const target = params[1];
      if (target === undefined) return { type: "clearchat", channel };
      const user = login.safeParse(target);
      return user.success ? { type: "clearchat", channel, login: user.data } : null;
    }

    default:
      return { type: "unknown", command };
  }
}

/** Parses one IRC line. Never throws. */
export function parseLine(raw: string): TwitchEvent {
  const line = splitLine(raw);
  if (!line) return { type: "unknown", command: "" };
  return toEvent(line) ?? { type: "unknown", command: line.command };
}

/** Twitch can batch several lines into one WebSocket frame, separated by \r\n. */
export function parseMessage(frame: string): TwitchEvent[] {
  return frame
    .split("\r\n")
    .filter((l) => l.trim())
    .map(parseLine);
}
