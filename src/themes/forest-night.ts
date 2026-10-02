import type { Theme } from "./types";

export const forestNight: Theme = {
  id: "forest-night",
  name: "Forest Night",
  bg: "#0B1A14",
  surface: "#12281F",
  primary: "#E9F1D6", // moonlight: titles and the glow in the corner
  accent: "#9BE564",
  text: "#E3EFE6",
  textMuted: "#9DB5A7",
  fontHeading: "Lora",
  fontBody: "Nunito Sans",
  radius: 12,
  border: "1px solid #24453A",
  shadow: "0 0 24px rgba(155, 229, 100, 0.12)",
  bgEffect: "fireflies",
  enter: { id: "slide-fade", durationMs: 600 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: "forest-night.ogg",
  badgeStyle: "pill",
  layout: "broadcast",
};
