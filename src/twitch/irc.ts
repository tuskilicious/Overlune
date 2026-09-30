import { parseMessage, type TwitchEvent } from "./parse";

// Anonymous, read-only Twitch chat over a plain WebSocket. The `justinfan` login
// needs no token, so nothing secret can ever end up in an overlay link.

export const IRC_URL = "wss://irc-ws.chat.twitch.tv:443";

/**
 * - `connecting`: first attempt.
 * - `connected`: Twitch confirmed the channel join.
 * - `reconnecting`: the connection dropped; retrying.
 * - `error`: can't reach chat or the channel never answered. Still retrying in the background.
 * - `bad-channel`: the name can't be a Twitch channel. No connection is made.
 */
export type ChatStatus = "connecting" | "connected" | "reconnecting" | "error" | "bad-channel";

/** The slice of the WebSocket API we use, so tests can pass a fake. */
export interface SocketLike {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((e: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
}

export interface ChatOptions {
  /** Every parsed event except PING, which is answered here. */
  onEvent: (e: TwitchEvent) => void;
  onStatus?: (s: ChatStatus) => void;
  createSocket?: (url: string) => SocketLike;
}

/** Failed attempts in a row before showing the error state. */
export const MAX_FAILURES = 4;
/** Twitch never answers a JOIN for a channel that doesn't exist, so we wait this long. */
export const JOIN_TIMEOUT_MS = 10_000;
/** Twitch pings about every 5 minutes. Silence longer than this means a dead socket. */
export const IDLE_TIMEOUT_MS = 6 * 60_000;
const MAX_BACKOFF_MS = 30_000;

/** 1s, 2s, 4s … up to 30s, with ±20% jitter so many overlays don't reconnect in lockstep. */
export const backoffMs = (failures: number) =>
  Math.min(MAX_BACKOFF_MS, 1000 * 2 ** (failures - 1)) * (0.8 + Math.random() * 0.4);

/** Accepts `name` or `#name` in any case. Returns the lowercase login, or null if it can't be one. */
export function normalizeChannel(raw: string): string | null {
  const c = raw.trim().replace(/^#/, "").toLowerCase();
  return /^[a-z0-9_]{1,25}$/.test(c) ? c : null;
}

/** Editor input → channel name. Accepts a pasted `twitch.tv/name` link, `#name` or `@name`; drops anything else a name can't hold. */
export function channelFromInput(raw: string): string {
  const name = raw
    .trim()
    .replace(/^(https?:\/\/)?(www\.|m\.)?twitch\.tv\//i, "")
    .replace(/^[#@]/, "")
    .split(/[/?#\s]/)[0]!;
  return name.replace(/[^A-Za-z0-9_]/g, "").slice(0, 25);
}

/** Connects to one channel's chat and keeps the connection alive. Returns a function that stops it. */
export function connectChat(rawChannel: string, options: ChatOptions): () => void {
  const {
    onEvent,
    onStatus = () => {},
    createSocket = (url) => new WebSocket(url) as unknown as SocketLike,
  } = options;

  const channel = normalizeChannel(rawChannel);
  if (!channel) {
    onStatus("bad-channel");
    return () => {};
  }

  let ws: SocketLike | null = null;
  let status: ChatStatus | undefined;
  let failures = 0;
  let stopped = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;
  let joinTimer: ReturnType<typeof setTimeout> | undefined;
  let idleTimer: ReturnType<typeof setTimeout> | undefined;

  const setStatus = (s: ChatStatus) => {
    if (s !== status) onStatus((status = s));
  };

  const detach = () => {
    clearTimeout(joinTimer);
    clearTimeout(idleTimer);
    if (!ws) return;
    const s = ws;
    ws = null;
    s.onopen = s.onmessage = s.onclose = s.onerror = null;
    try {
      s.close();
    } catch {
      // Already closed.
    }
  };

  const retry = (hardFail = false) => {
    detach();
    if (stopped) return;
    failures++;
    setStatus(hardFail || failures >= MAX_FAILURES ? "error" : "reconnecting");
    retryTimer = setTimeout(open, backoffMs(failures));
  };

  const resetIdle = () => {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => retry(), IDLE_TIMEOUT_MS);
  };

  function open() {
    if (!status) setStatus("connecting");
    let s: SocketLike;
    try {
      s = createSocket(IRC_URL);
    } catch {
      retry();
      return;
    }
    ws = s;

    s.onopen = () => {
      s.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
      s.send(`NICK justinfan${10000 + Math.floor(Math.random() * 90000)}`);
      s.send(`JOIN #${channel}`);
      joinTimer = setTimeout(() => retry(true), JOIN_TIMEOUT_MS);
      resetIdle();
    };

    s.onmessage = ({ data }) => {
      if (typeof data !== "string") return;
      resetIdle();
      for (const e of parseMessage(data)) {
        if (ws !== s) return; // Stopped or replaced while handling an earlier line.
        if (e.type === "ping") {
          s.send(`PONG :${e.token}`);
        } else if (e.type === "unknown" && e.command === "RECONNECT") {
          retry(); // Twitch asks clients to reconnect before server maintenance.
          return;
        } else {
          if (e.type === "unknown" && e.command === "ROOMSTATE") {
            clearTimeout(joinTimer);
            failures = 0;
            setStatus("connected");
          }
          onEvent(e);
        }
      }
    };

    s.onclose = s.onerror = () => retry();
  }

  open();

  return () => {
    stopped = true;
    clearTimeout(retryTimer);
    detach();
  };
}
