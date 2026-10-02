import type { Theme } from "./types";

export const pastelCloud: Theme = {
  id: "pastel-cloud",
  name: "Pastel Cloud",
  bg: "#FDE7F0", // the clouds effect fades it into a pale tint of `primary`
  surface: "#FFFFFF",
  primary: "#7B5BD6",
  accent: "#B0367D",
  text: "#4B3F6B",
  textMuted: "#6E6290",
  fontHeading: "Baloo 2",
  fontBody: "Quicksand",
  radius: 24,
  border: "2px solid #F3D9F0",
  shadow: "0 8px 24px rgba(123, 91, 214, 0.18)",
  bgEffect: "clouds",
  enter: { id: "bounce", durationMs: 500 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "bounce",
  alertSound: "pastel-cloud.ogg",
  badgeStyle: "pill",
  layout: "broadcast",
};
