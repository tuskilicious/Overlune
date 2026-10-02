import type { Theme } from "./types";

export const cozyCafe: Theme = {
  id: "cozy-cafe",
  name: "Cozy Café",
  bg: "#F4EADB",
  surface: "#FFF8EE",
  primary: "#6B4A35",
  accent: "#9C5A2C",
  text: "#3B2A20",
  textMuted: "#7A6354",
  fontHeading: "Fredoka",
  fontBody: "Nunito",
  radius: 20,
  border: "1px solid #E6D3BA",
  shadow: "0 6px 18px rgba(107, 74, 53, 0.18)",
  bgEffect: "steam",
  enter: { id: "bounce", durationMs: 500 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "bounce",
  alertSound: "cozy-cafe.ogg",
  badgeStyle: "pill",
  layout: "broadcast",
};
