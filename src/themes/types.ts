// Every theme defines exactly these tokens (docs/DESIGN.md "Theme token set").
// Id unions list only the effects/animations that exist today; each new theme adds its own.

export const themeIds = [
  "clean-slate",
  "neon-grid",
  "cozy-cafe",
  "arcade-8bit",
  "pastel-cloud",
  "forest-night",
  "bold-esports",
  "vaporwave-sunset",
  "daylight",
  "abyss",
  "session",
  "shonen",
] as const;
/** Bundled @fontsource families (OFL, docs/ASSETS.md). Loaded by src/themes/fonts.ts. Only add to the end. */
export const fontIds = [
  "Inter",
  "Orbitron",
  "Rajdhani",
  "Fredoka",
  "Nunito",
  "Press Start 2P",
  "VT323",
  "Baloo 2",
  "Quicksand",
  "Lora",
  "Nunito Sans",
  "Anton",
  "Barlow",
  "Audiowide",
  "Space Grotesk",
  "Unbounded",
  "Manrope",
  "Archivo Black",
  "Archivo",
  "Bangers",
  "Comic Neue",
] as const;
export type FontId = (typeof fontIds)[number];
/** Theme colors a streamer can override under "Advanced". */
export const colorTokens = ["bg", "surface", "primary", "accent", "text", "textMuted"] as const;
export type ColorToken = (typeof colorTokens)[number];
export type ThemeId = (typeof themeIds)[number];
export type BgEffect =
  | "none"
  | "grid"
  | "steam"
  | "scanlines"
  | "clouds"
  | "fireflies"
  | "sunset"
  | "abyss"
  | "session"
  | "shonen";
export type AnimId = "slide-fade" | "bounce" | "steps" | "wipe";
export type AlertAnimId = "slide-fade" | "glitch" | "bounce" | "steps" | "wipe";
export type BadgeStyle = "pill";

export interface Anim {
  id: AnimId;
  durationMs: number;
}

export interface Theme {
  id: ThemeId;
  name: string;
  /** Scene background: any CSS color or gradient. */
  bg: string;
  surface: string;
  primary: string;
  accent: string;
  /** Body text on `surface`. */
  text: string;
  textMuted: string;
  /** @fontsource family names. */
  fontHeading: string;
  fontBody: string;
  radius: number;
  /** CSS `border` shorthand for surfaces. */
  border: string;
  /** CSS `box-shadow` for surfaces (glow, soft shadow), or "none". */
  shadow: string;
  bgEffect: BgEffect;
  enter: Anim;
  exit: Anim;
  alertAnim: AlertAnimId;
  /** File in public/sounds (licensed, see docs/ASSETS.md), or null for a silent theme. */
  alertSound: string | null;
  badgeStyle: BadgeStyle;
}
