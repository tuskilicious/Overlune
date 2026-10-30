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
 * deleted the connection closes for good and the overlay keeps what it shows. A connection that never opened asks the
 * channel's address plainly (T12.4): a 404 means the overlay is gone, so it stops instead of trying forever. Returns a
 * function that stops it.
 */
export function followLive(
  id: string,
  onSettings: (settings: string, version: number) => void,
  {
    origin,
    WebSocketImpl = WebSocket,
    fetchImpl = (url: string) => fetch(url),
    random = Math.random,
  }: {
    /** The site the overlay runs on (location.origin): the channel is on the same one. */
    origin: string;
    WebSocketImpl?: typeof WebSocket;
    fetchImpl?: (url: string) => Promise<{ status: number }>;
    random?: () => number;
  },
): () => void {
  const address = `${origin}/api/live/${encodeURIComponent(id)}`;
  const url = address.replace(/^http/, "ws");
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
    let opened = false;
    ws.addEventListener("open", () => {
      opened = true;
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
      const later = () => {
        if (stopped) return;
        const wait = Math.min(MAX_WAIT_MS, 1000 * 2 ** tries++) * (0.5 + random() / 2);
        retry = setTimeout(connect, wait);
      };
      if (opened) return later();
      fetchImpl(address).then(
        (res) => (res.status === 404 ? stop() : later()),
        later, // the site itself is out of reach: try again later
      );
    });
  };

  connect();
  return stop;
}
