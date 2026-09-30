import { z } from "zod";
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

const isTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

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
    })
    .prefault({}),
  brb: z.object({ title: text(60, "Be right back"), subtitle: text(120) }).prefault({}),
  ending: z.object({ title: text(60, "Thanks for watching!"), subtitle: text(120) }).prefault({}),
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
