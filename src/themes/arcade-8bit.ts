import type { Theme } from "./types";

export const arcade8bit: Theme = {
  id: "arcade-8bit",
  name: "Arcade 8-Bit",
  bg: "#1A1030",
  surface: "#2B1B4F",
  primary: "#FFD23F",
  accent: "#3EE6A0",
  text: "#FFFFFF",
  textMuted: "#C9BDEB",
  fontHeading: "Press Start 2P",
  fontBody: "VT323",
  radius: 0,
  border: "4px solid #FFD23F",
  shadow: "6px 6px 0 #FF5C7A",
  bgEffect: "scanlines",
  enter: { id: "steps", durationMs: 400 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "steps",
  alertSound: "arcade-8bit.ogg",
  badgeStyle: "pill",
  layout: "broadcast",
};
