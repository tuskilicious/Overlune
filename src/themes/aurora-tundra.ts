import type { Theme } from "./types";

/** Ice shelf (T11.6, owner-selected A): upright expedition lettering above layered polar ice, with one true crescent
 * etched into the shelf's far edge. The high aurora belongs to the polar sky; no trees, snow particles or sea life. */
export const auroraTundra: Theme = {
  id: "aurora-tundra",
  name: "Aurora Tundra",
  bg: "#142D38",
  surface: "#203E49",
  primary: "#EFF8FA",
  accent: "#A7E6D2",
  text: "#EFF8FA",
  textMuted: "#B5CCD1",
  fontHeading: "Alegreya",
  fontBody: "Manrope",
  radius: 2,
  border: "1px solid color-mix(in srgb, var(--accent) 28%, var(--surface))",
  shadow: "none",
  bgEffect: "aurora-tundra",
  enter: { id: "slide-fade", durationMs: 800 },
  exit: { id: "slide-fade", durationMs: 350 },
  alertAnim: "slide-fade",
  alertSound: "aurora-tundra.ogg",
  badgeStyle: "pill",
};
