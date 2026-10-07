import type { Theme } from "./types";

/** T6.109: the stream as a dive. The water is unlit and the only light is alive: the accent is kept for living things
 *  (the headline's last word, the breathing countdown, glowing motes in the marine snow). */
export const abyss: Theme = {
  id: "abyss",
  name: "Abyss",
  bg: "#040B14", // the abyss effect lightens the top toward the last surface light
  surface: "#071521",
  primary: "#E3F2F4",
  accent: "#5CF2D6", // bioluminescent
  text: "#D6E6EE",
  textMuted: "#8FB3C1",
  fontHeading: "Unbounded",
  fontBody: "Manrope",
  radius: 4,
  border: "1px solid #16343A", // a hairline seam, never a glow
  shadow: "none",
  bgEffect: "abyss",
  enter: { id: "slide-fade", durationMs: 700 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: "forest-night.ogg",
  badgeStyle: "pill",
};
