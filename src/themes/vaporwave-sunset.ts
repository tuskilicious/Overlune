import type { Theme } from "./types";

export const vaporwaveSunset: Theme = {
  id: "vaporwave-sunset",
  name: "Vaporwave Sunset",
  bg: "#2B0F4C", // the sunset effect fades it into coral and orange at the horizon
  surface: "#1B0B33",
  primary: "#01CDFE", // the band across the chrome titles
  accent: "#FF71CE",
  text: "#FFFBF5",
  textMuted: "#C9B6E4",
  fontHeading: "Audiowide",
  fontBody: "Space Grotesk",
  radius: 6,
  border: "1px solid #FF71CE",
  shadow: "0 0 18px rgba(255, 113, 206, 0.35)",
  bgEffect: "sunset",
  enter: { id: "slide-fade", durationMs: 400 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: "vaporwave-sunset.ogg",
  badgeStyle: "pill",
};
