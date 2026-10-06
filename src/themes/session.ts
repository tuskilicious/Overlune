import type { Theme } from "./types";

/** T6.110: every scene is a frame of a jazz-session anime (title card, eyecatch, end card). Flat mustard ground, teal
 *  and brick bars, cream cards, ink type and outlines, print grain over everything. */
export const session: Theme = {
  id: "session",
  name: "Session",
  bg: "#E0B23C", // mustard; the session effect slices it with teal and brick bars
  surface: "#F1E6CF", // cream
  primary: "#0E0E0E", // ink
  accent: "#B23A2E", // brick
  text: "#0E0E0E",
  textMuted: "#4F4334",
  fontHeading: "Archivo Black",
  fontBody: "Archivo",
  radius: 0,
  border: "3px solid #0E0E0E",
  shadow: "none",
  bgEffect: "session",
  enter: { id: "wipe", durationMs: 350 },
  exit: { id: "wipe", durationMs: 250 },
  alertAnim: "wipe",
  alertSound: "cozy-cafe.ogg",
  badgeStyle: "pill",
};
