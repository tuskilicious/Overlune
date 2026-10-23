/** How often an open connection pings, so idle ones aren't closed along the way. The channel answers without waking
 *  (functions/live.ts). ponytail: each ping still counts toward the Durable Object's requests (about 100 a day per
 *  open overlay at this pace); lengthen it if that ever matters. */
export const PING_MS = 45_000;
/** The longest wait between reconnects. */
export const MAX_WAIT_MS = 30_000;

interface Publish {
  version: number;
  settings: string;
}

const isPublish = (d: unknown): d is Publish =>
  typeof d === "object" &&
  d !== null &&
  typeof (d as Publish).version === "number" &&
  typeof (d as Publish).settings === "string";

const isDeleted = (d: unknown) =>
  typeof d === "object" && d !== null && (d as { deleted?: unknown }).deleted === true;

/**
 * Follows a saved overlay's live channel (T12.3): each "Update OBS" arrives as the published settings in the link's
 * form, and only a newer version than the last counts. A dropped connection comes back after a growing wait, 1 s up to
 * 30 s, spread out so a restart doesn't bring every OBS back at once; a working one resets it. When the overlay is
 * deleted the connection closes for good and the overlay keeps what it shows. Returns a function that stops it.
 */
export function followLive(
  id: string,
  onSettings: (settings: string, version: number) => void,
  {
    origin,
    WebSocketImpl = WebSocket,
    random = Math.random,
  }: {
    /** The site the overlay runs on (location.origin): the channel is on the same one. */
    origin: string;
    WebSocketImpl?: typeof WebSocket;
    random?: () => number;
  },
): () => void {
  const url = `${origin.replace(/^http/, "ws")}/api/live/${encodeURIComponent(id)}`;
  let stopped = false;
  let newest = -1;
  let tries = 0;
  let socket: WebSocket | undefined;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let ping: ReturnType<typeof setInterval> | undefined;

  const stop = () => {
    stopped = true;
    if (retry) clearTimeout(retry);
    if (ping) clearInterval(ping);
    socket?.close(1000);
  };

  const connect = () => {
    const ws = new WebSocketImpl(url);
    socket = ws;
    ws.addEventListener("open", () => {
      tries = 0;
      ping = setInterval(() => ws.send("ping"), PING_MS);
    });
    ws.addEventListener("message", (e) => {
      let data: unknown;
      try {
        data = JSON.parse(String(e.data));
      } catch {
        return; // "pong", or anything else that isn't ours
      }
      if (isDeleted(data)) stop();
      else if (isPublish(data) && data.version > newest) {
        newest = data.version;
        onSettings(data.settings, data.version);
      }
    });
    ws.addEventListener("close", () => {
      if (ping) clearInterval(ping);
      if (stopped) return;
      const wait = Math.min(MAX_WAIT_MS, 1000 * 2 ** tries++) * (0.5 + random() / 2);
      retry = setTimeout(connect, wait);
    });
  };

  connect();
  return stop;
}
