import type { Theme } from "./types";

/** Observatory rail (T11.3, owner-selected A): one gold corona crescent balances a left title plate and a low
 * information rail. Night violet is the named lunar ground. No starfield, orbit rings, glass or animated glow. */
export const eclipse: Theme = {
  id: "eclipse",
  name: "Eclipse",
  bg: "#12101E",
  surface: "#211E32",
  primary: "#F2EDE5",
  accent: "#DBAD60",
  text: "#F2EDE5",
  textMuted: "#B6ACCA",
  fontHeading: "Manrope",
  fontBody: "Barlow",
  radius: 2,
  border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--surface))",
  shadow: "none",
  bgEffect: "eclipse",
  enter: { id: "slide-fade", durationMs: 700 },
  exit: { id: "slide-fade", durationMs: 350 },
  alertAnim: "slide-fade",
  alertSound: "eclipse.ogg",
  badgeStyle: "pill",
};
