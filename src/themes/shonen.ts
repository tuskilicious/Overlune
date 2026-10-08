import type { Theme } from "./types";

/** T6.111: every scene is a manga page. Paper and ink with one spot color (manga red), screentone, speed lines, a
 *  heavy panel border, and Bangers lettering with a white knockout stroke. */
export const shonen: Theme = {
  id: "shonen",
  name: "Shonen",
  bg: "#F4F3EE", // paper
  surface: "#FFFFFF",
  primary: "#111111", // ink
  accent: "#D61F26", // the spot color
  text: "#111111",
  textMuted: "#454545",
  fontHeading: "Bangers",
  fontBody: "Comic Neue",
  radius: 0,
  border: "4px solid #111111",
  shadow: "none",
  bgEffect: "shonen",
  enter: { id: "slide-fade", durationMs: 300 },
  exit: { id: "slide-fade", durationMs: 250 },
  alertAnim: "bounce", // an impact, like a panel landing
  alertSound: "shonen.ogg",
  badgeStyle: "pill",
};
