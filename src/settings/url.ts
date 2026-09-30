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

  const parsed = settingsV1.safeParse(data);
  if (parsed.success) return { settings: parsed.data, ok: true };

  // Keep every top-level field that is still valid, so one bad logo doesn't wipe the titles.
  const input = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const kept: Record<string, unknown> = {};
  for (const [key, field] of Object.entries(settingsV1.shape)) {
    const r = field.safeParse(input[key]);
    if (r.success) kept[key] = r.data;
  }
  return { settings: settingsV1.parse(kept), ok: false };
}
