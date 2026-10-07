import { z } from "zod";
import { isTimeZone } from "../lib/time";
import { isHttpsUrl } from "../lib/url-safety";
import { colorTokens, fontIds, themeIds } from "../themes/types";

// PUBLIC CONTRACT: v1 links are in the wild once shipped. Only add fields with defaults.
// Renaming, removing or tightening a field needs a new version plus a migration (CLAUDE.md).

/** Text that is cut to `max` characters instead of rejected. Counts code points so emoji are never split. */
const text = (max: number, fallback = "") =>
  z
    .string()
    .transform((s) => Array.from(s).slice(0, max).join(""))
    .default(fallback);

/** Only plain #rrggbb, never arbitrary CSS (no url(), gradients or other tricks). */
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Colors must look like #1a2b3c");

export const socialPlatforms = [
  "twitch",
  "youtube",
  "tiktok",
  "instagram",
  "x",
  "discord",
] as const;

/** Default alert messages. `{s}` is "s" unless the amount is 1. */
export const defaultTemplates = {
  raid: "{user} is raiding with {amount} viewer{s}!",
  sub: "{user} just subscribed!",
  resub: "{user} subscribed for {amount} month{s}!",
  subgift: "{user} gifted {amount} sub{s}!",
  bits: "{user} cheered {amount} bit{s}!",
} as const;

/** Common chat bots, hidden unless the streamer removes them from the list. */
export const defaultBots = [
  "nightbot",
  "streamelements",
  "streamlabs",
  "moobot",
  "fossabot",
  "wizebot",
  "sery_bot",
  "soundalerts",
  "botrixoficial",
  "kofistreambot",
  "streamstickers",
  "pokemoncommunitygame",
] as const;

export const settingsV1 = z.object({
  theme: z.enum(themeIds).default("clean-slate"),
  logo: z
    .string()
    .max(2048)
    .refine((s) => s === "" || isHttpsUrl(s), "Logo must be an https: link")
    .default(""),
  socials: z
    .array(z.object({ platform: z.enum(socialPlatforms), handle: text(40) }))
    .max(6)
    .default([]),
  starting: z
    .object({
      title: text(60, "Starting soon"),
      subtitle: text(120),
      /** Countdown end as a UTC instant (epoch ms), so reloads never reset it. */
      endsAt: z.number().int().nonnegative().nullable().default(null),
      tz: z.string().max(64).refine(isTimeZone, "Unknown time zone").default("UTC"),
      doneText: text(60, "Starting now!"),
      /** Repeating countdown (T6.8): when not "off", counts to the next matching time in `tz` instead of `endsAt`. */
      repeat: z
        .object({
          mode: z.enum(["off", "daily", "days"]).default("off"),
          /** Weekdays for "days": 0 = Sunday … 6 = Saturday. */
          days: z.array(z.number().int().min(0).max(6)).max(7).default([]),
          /** Wall-clock start time in `tz`, "HH:MM". */
          time: z
            .string()
            .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Times look like 20:00")
            .default("20:00"),
        })
        .prefault({}),
    })
    .prefault({}),
  brb: z.object({ title: text(60, "Be right back"), subtitle: text(120) }).prefault({}),
  ending: z.object({ title: text(60, "Thanks for watching!"), subtitle: text(120) }).prefault({}),
  /** Chat overlay (T3.3). `channel` is a Twitch login; "" until the streamer adds it. */
  chat: z
    .object({
      channel: z
        .string()
        .regex(/^[A-Za-z0-9_]{0,25}$/, "Channel names use letters, numbers and _")
        .default(""),
      /** Hide messages starting with "!" (T3.4). */
      hideCommands: z.boolean().default(true),
      /** Lowercase logins whose messages are hidden (T3.4). Editable, so a streamer can keep a bot visible. */
      bots: z
        .array(z.string().regex(/^[a-z0-9_]{1,25}$/, "Bot names use a-z, 0-9 and _"))
        .max(50)
        .default(() => [...defaultBots]),
      /** Chat box size in px (T3.5). The streamer enters the same numbers in OBS. */
      width: z.number().int().min(250).max(1920).default(400),
      height: z.number().int().min(200).max(1080).default(600),
      /** Text size multiplier (T3.5). */
      fontScale: z.number().min(0.75).max(2).default(1),
      /** Seconds before a message fades away; 0 keeps messages (T3.5). */
      fadeAfter: z.number().int().min(0).max(600).default(0),
      /** Role badges (Mod, Sub, VIP…) before names (T6.76). Old links have no field and keep them. */
      showBadges: z.boolean().default(true),
    })
    .prefault({}),
  /** Alert messages (T4.3). {user}, {amount} and {s} are filled in; "" means the default. */
  alerts: z
    .object({
      templates: z
        .object({
          raid: text(100, defaultTemplates.raid),
          sub: text(100, defaultTemplates.sub),
          resub: text(100, defaultTemplates.resub),
          subgift: text(100, defaultTemplates.subgift),
          bits: text(100, defaultTemplates.bits),
        })
        .prefault({}),
      /** Alert sound volume in percent; 0 is silent (T4.4). */
      volume: z.number().int().min(0).max(100).default(70),
      /** How long each alert stays on screen (T6.75). Old links have no field and keep 5 seconds. */
      seconds: z.number().int().min(3).max(15).default(5),
    })
    .prefault({}),
  /** Webcam frame (T6.88): a border in the look with a clear middle, placed over the camera in OBS. Old links have no
   *  field and get the defaults; they never used it. */
  frame: z
    .object({
      width: z.number().int().min(160).max(1920).default(640),
      height: z.number().int().min(120).max(1080).default(360),
      /** Optional name on a tab at the bottom left; "" shows none. */
      label: text(40),
    })
    .prefault({}),
  /** Less motion in every overlay (T6.74): the same as the ?rm=1 flag, kept in the link so the editor remembers
   *  it. Old links have no field and keep full motion. */
  lessMotion: z.boolean().default(false),
  /** Lite motion (T6.119): entrances, countdown flips and alerts keep moving, the looping backgrounds stop. For
   *  slower PCs. Old links have no field and keep full motion; lessMotion wins when both are set. */
  liteMotion: z.boolean().default(false),
  /** "Advanced" overrides on top of the theme (T2.7). Empty means the theme as designed. */
  advanced: z
    .object({
      colors: z.partialRecord(z.enum(colorTokens), hexColor).default({}),
      fontHeading: z.enum(fontIds).nullable().default(null),
      fontBody: z.enum(fontIds).nullable().default(null),
    })
    .prefault({}),
});

export type Settings = z.output<typeof settingsV1>;

export const defaultSettings: Settings = settingsV1.parse({});
