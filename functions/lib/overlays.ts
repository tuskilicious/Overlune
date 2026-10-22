import { decompressFromEncodedURIComponent } from "lz-string";
import { z } from "zod";
import { settingsV1 } from "../../src/settings/schema";
import { json, type Env } from "./env";
import { MAX_OVERLAY_BODY_BYTES } from "./limits";

/**
 * Saved overlays' rules (T12.2): ids, names, and the settings a streamer saves, which are checked on every write.
 *
 * Settings travel and are stored in the link's own form, `1.<lz-string>` (src/settings/url.ts), so a saved overlay's
 * snapshot can go straight into its links (T12.4), and a row stays small enough for a backup's one-line INSERT
 * (BACKUPS.md). The server only decodes and checks them: compressing again cost about 8 ms of a full layout's 12 ms
 * (2026-10-22, a laptop), most of the free plan's 10 ms of CPU. So the client's string is kept as it is, and only when
 * the schema keeps every part of it exactly: unknown fields, text over its length, anything the schema would drop or
 * change, is refused instead.
 */

/** Up to this many per account (owner, 2026-10-20). */
export const OVERLAY_LIMIT = 10;
/** One copy of the settings, encoded: more than a link's 24 KB (STACK.md), and a row (draft and published) stays under
 *  D1's 100 KB statement, so a backup restores line by line. */
export const MAX_SETTINGS_CHARS = 32 * 1024;
/** What a copy may decode to, checked before parsing it. */
const MAX_SETTINGS_JSON = 512 * 1024;

/** 128 random bits, base64url: 22 characters. */
export const newOverlayId = () =>
  btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(16))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
/** Any other id can't be one of ours, so it's "not found" without a query. */
export const isOverlayId = (id: string) => /^[A-Za-z0-9_-]{22}$/.test(id);

/** Whether `raw` says nothing the schema dropped or changed: each of its keys and values is in `parsed` as it is. */
function kept(raw: unknown, parsed: unknown): boolean {
  if (Array.isArray(raw))
    return (
      Array.isArray(parsed) &&
      raw.length === parsed.length &&
      raw.every((v, i) => kept(v, parsed[i]))
    );
  if (raw !== null && typeof raw === "object")
    return (
      parsed !== null &&
      typeof parsed === "object" &&
      !Array.isArray(parsed) &&
      Object.entries(raw).every(
        ([key, value]) =>
          Object.hasOwn(parsed, key) && kept(value, (parsed as Record<string, unknown>)[key]),
      )
    );
  return Object.is(raw, parsed);
}

/** Settings in the link's form, if they're valid, complete as given, and within the size limits; otherwise null. */
export function checkSettings(encoded: string): string | null {
  if (encoded.length > MAX_SETTINGS_CHARS || !encoded.startsWith("1.")) return null;
  let raw: unknown;
  try {
    const json = decompressFromEncodedURIComponent(encoded.slice(2));
    if (!json || json.length > MAX_SETTINGS_JSON) return null;
    raw = JSON.parse(json);
  } catch {
    return null;
  }
  const parsed = settingsV1.safeParse(raw);
  return parsed.success && kept(raw, parsed.data) ? encoded : null;
}

/** A name to tell your overlays apart: 1 to 40 characters after trimming, with no control characters. */
const name = z
  .string()
  .trim()
  .refine((s) => {
    const length = Array.from(s).length;
    return length >= 1 && length <= 40 && !Array.from(s).some((c) => c < " " || c === "\u007f");
  });
const settings = z.string().max(MAX_SETTINGS_CHARS);

/** What a client may send: these fields and no others (CLAUDE.md §4, no mass assignment). */
export const createBody = z.strictObject({ name, settings });
export const updateBody = z
  .strictObject({ name: name.optional(), settings: settings.optional() })
  .refine((b) => b.name !== undefined || b.settings !== undefined);

/** The request's body as text, or null when it's bigger than `max` bytes, counted as it arrives: Content-Length can
 *  be missing (abuseLimits checks it when it's there). */
export async function readBody(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > max) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let at = 0;
  for (const c of chunks) {
    bytes.set(c, at);
    at += c.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** A JSON body that fits `schema`, or the answer to give instead: 413 too big, 400 anything else. */
export async function parseBody<T>(request: Request, schema: z.ZodType<T>): Promise<T | Response> {
  const text = await readBody(request, MAX_OVERLAY_BODY_BYTES);
  if (text === null) return json({ error: "too large" }, 413);
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return json({ error: "invalid body" }, 400);
  }
  const parsed = schema.safeParse(data);
  return parsed.success ? parsed.data : json({ error: "invalid body" }, 400);
}

/** What the live channel sends (T12.3): each publish's version and settings in the link's form, or that the overlay
 *  was deleted, after which a copy keeps what it shows and closes (src/lib/live.ts). */
export const liveMessage = (version: number, settings: string) =>
  JSON.stringify({ version, settings });
export const LIVE_DELETED = JSON.stringify({ deleted: true });

/** The overlay's live channel (T12.3, functions/live.ts). */
export const liveChannel = (env: Env, id: string) => env.LIVE.getByName(id);
