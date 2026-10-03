import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from "lz-string";
import { defaultSettings, settingsV1, type Settings } from "./schema";

// Link format (public contract): /o/<overlay>#<version>.<lz-string payload>
const VERSION = "1";

export function encode(settings: Settings): string {
  return `${VERSION}.${compressToEncodedURIComponent(JSON.stringify(settings))}`;
}

export interface Decoded {
  settings: Settings;
  /** false when the link was damaged or had invalid fields; the overlay shows its error state. */
  ok: boolean;
}

/**
 * Settings from anything a streamer might paste: an overlay link, an editor link, or just "#1.…".
 * null when there is no settings part. Only decodes; never opens the link.
 */
export function decodeLink(text: string): Decoded | null {
  const i = text.indexOf("#");
  const hash = i === -1 ? "" : text.slice(i + 1).trim();
  return hash === "" ? null : decode(hash);
}

/** Never throws. Accepts the hash with or without its leading "#". */
export function decode(hash: string): Decoded {
  const raw = hash.replace(/^#/, "");
  if (raw === "") return { settings: defaultSettings, ok: true };

  const dot = raw.indexOf(".");
  if (raw.slice(0, dot) !== VERSION) return { settings: defaultSettings, ok: false };

  let data: unknown;
  try {
    data = JSON.parse(decompressFromEncodedURIComponent(raw.slice(dot + 1)) || "null");
  } catch {
    return { settings: defaultSettings, ok: false };
  }

  let parsed = settingsV1.safeParse(data);
  if (parsed.success) return { settings: parsed.data, ok: true };

  // Drop only the bad parts, one at a time, so a time zone this OBS doesn't know keeps the titles.
  // Capped, since a hand-made link could hold any number of bad parts.
  for (let tries = 0; tries < 100 && !parsed.success; tries++) {
    const path = parsed.error.issues[0]?.path ?? [];
    // A repeating countdown in the wrong zone or at a made-up time would be wrong on stream, so it goes whole.
    const countdown =
      path[0] === "starting" &&
      (path[1] === "tz" || path[1] === "repeat") &&
      ["daily", "days"].includes(String(at(data, ["starting", "repeat", "mode"])));
    const paths = countdown ? ["endsAt", "tz", "repeat"].map((key) => ["starting", key]) : [path];
    if (!paths.map((p) => drop(data, p)).some(Boolean)) break;
    parsed = settingsV1.safeParse(data);
  }
  return { settings: parsed.success ? parsed.data : defaultSettings, ok: false };
}

/** Removes the value at `path`, or the whole list item when the path goes into one. false if nothing changed. */
function drop(data: unknown, path: readonly PropertyKey[]): boolean {
  const item = path.findIndex((key) => typeof key === "number");
  const cut = item === -1 ? path : path.slice(0, item + 1);
  const last = cut[cut.length - 1];
  if (last === undefined) return false;
  const parent = at(data, cut.slice(0, -1));
  if (Array.isArray(parent) && typeof last === "number" && last < parent.length) {
    parent.splice(last, 1);
    return true;
  }
  if (typeof parent !== "object" || parent === null || !Object.hasOwn(parent, last)) return false;
  delete (parent as Record<PropertyKey, unknown>)[last];
  return true;
}

/** The value at `path`, or undefined. */
function at(data: unknown, path: readonly PropertyKey[]): unknown {
  let value = data;
  for (const key of path) {
    if (typeof value !== "object" || value === null) return undefined;
    value = (value as Record<PropertyKey, unknown>)[key];
  }
  return value;
}
