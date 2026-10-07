import type { Theme } from "./types";

/** T6.128: a fantasy RPG quest log. Gold carved capitals over a dark hall, parchment panels with gilt edges, and
 *  embers rising from below. */
export const quest: Theme = {
  id: "quest",
  name: "Quest",
  bg: "#1B130C",
  surface: "#F2E4C4", // parchment
  primary: "#F2D489", // gold
  accent: "#8E2A1E", // wax-seal red
  text: "#3A2716",
  textMuted: "#6A4D2E",
  fontHeading: "Cinzel",
  fontBody: "Alegreya",
  radius: 6,
  border: "2px solid #B88F3E",
  shadow: "0 18px 44px rgba(0, 0, 0, 0.5)",
  bgEffect: "quest",
  enter: { id: "slide-fade", durationMs: 800 },
  exit: { id: "slide-fade", durationMs: 350 },
  alertAnim: "slide-fade",
  alertSound: "forest-night.ogg",
  badgeStyle: "pill",
};
