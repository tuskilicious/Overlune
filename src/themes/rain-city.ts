import type { Theme } from "./types";

/** Last train home (T11.4, owner-selected B): a station marquee on a wet night street, with one crescent tube sign in
 * a lit panel and its reflection in the street below. No skyline, synthwave floor, scanlines or glowing borders. */
export const rainCity: Theme = {
  id: "rain-city",
  name: "Rain City",
  bg: "#101A24",
  surface: "#1B2B38",
  primary: "#F0F4F5",
  accent: "#71D6D1",
  text: "#E8EFF2",
  textMuted: "#A8BDC8",
  fontHeading: "Rajdhani",
  fontBody: "Archivo",
  radius: 2,
  border: "1px solid color-mix(in srgb, var(--accent) 30%, var(--surface))",
  shadow: "none",
  bgEffect: "rain-city",
  enter: { id: "slide-fade", durationMs: 600 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: "rain-city.ogg",
  badgeStyle: "pill",
};
