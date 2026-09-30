// Every theme defines exactly these tokens (docs/DESIGN.md "Theme token set").
// Id unions list only the effects/animations that exist today; each new theme adds its own.

export type ThemeId = "clean-slate";
export type BgEffect = "none";
export type AnimId = "slide-fade";
export type AlertAnimId = "slide-fade";
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
  bgEffect: BgEffect;
  enter: Anim;
  exit: Anim;
  alertAnim: AlertAnimId;
  /** File in public/sounds (licensed, see docs/ASSETS.md). null until T4.4 ships sounds. */
  alertSound: string | null;
  badgeStyle: BadgeStyle;
}
