import type { Theme } from "./types";

export const neonGrid: Theme = {
  id: "neon-grid",
  name: "Neon Grid",
  bg: "#07060D",
  surface: "#120F24",
  primary: "#00F0FF",
  accent: "#FF2BD6",
  text: "#EAF6FF",
  textMuted: "#9AA8C8",
  fontHeading: "Orbitron",
  fontBody: "Rajdhani",
  radius: 2,
  border: "1px solid #00F0FF",
  shadow: "0 0 12px rgba(0, 240, 255, 0.55), inset 0 0 8px rgba(0, 240, 255, 0.2)",
  bgEffect: "grid",
  enter: { id: "slide-fade", durationMs: 300 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "glitch",
  alertSound: "neon-grid.ogg",
  badgeStyle: "pill",
};
