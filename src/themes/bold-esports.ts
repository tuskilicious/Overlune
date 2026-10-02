import type { Theme } from "./types";

export const boldEsports: Theme = {
  id: "bold-esports",
  name: "Bold Esports",
  bg: "#0E0E10",
  surface: "#1A1A1E",
  primary: "#FFFFFF",
  accent: "#FF2E3A",
  text: "#FFFFFF",
  textMuted: "#A0A0AB",
  fontHeading: "Anton",
  fontBody: "Barlow",
  radius: 0,
  border: "none",
  shadow: "none", // clip-path cuts shadows off; the `wipe` style angles every box instead
  bgEffect: "none",
  enter: { id: "wipe", durationMs: 250 },
  exit: { id: "slide-fade", durationMs: 200 },
  alertAnim: "wipe",
  alertSound: "bold-esports.ogg",
  badgeStyle: "pill",
  layout: "broadcast",
};
