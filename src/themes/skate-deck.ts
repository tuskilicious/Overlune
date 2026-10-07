import type { Theme } from "./types";

/** T6.126: a skate-shop deck wall. Maple ply, grip-tape black panels, and a deck in screaming aqua and pink. */
export const skateDeck: Theme = {
  id: "skate-deck",
  name: "Skate Deck",
  bg: "#E8B877", // maple; the skate effect adds the grain and the deck
  surface: "#151515", // grip tape
  primary: "#151515",
  accent: "#FF4FA3", // hot pink
  text: "#F7F2E8",
  textMuted: "#BDB5A8",
  fontHeading: "Bungee",
  fontBody: "Barlow",
  radius: 18,
  border: "3px solid #151515",
  shadow: "none",
  bgEffect: "skate",
  enter: { id: "bounce", durationMs: 500 },
  exit: { id: "slide-fade", durationMs: 250 },
  alertAnim: "bounce",
  alertSound: "arcade-8bit.ogg",
  badgeStyle: "pill",
};
