import type { Theme } from "./types";

/** Window in the paper (T11.5, owner-selected B): layered blue, white and plum sheets, with one crescent window cut
 * through the plum. Depth comes from the sheets' edges and still shadows, not borders, stickers or tilted cards. */
export const paperCut: Theme = {
  id: "paper-cut",
  name: "Paper Cut",
  bg: "#E8EEF4",
  surface: "#FFFFFF",
  primary: "#243550",
  accent: "#8540A8",
  text: "#243550",
  textMuted: "#536176",
  fontHeading: "Quicksand",
  fontBody: "Nunito Sans",
  radius: 2,
  border: "1px solid color-mix(in srgb, var(--primary) 14%, var(--surface))",
  shadow: "0 10px 24px rgb(36 53 80 / 0.14)",
  bgEffect: "paper-cut",
  enter: { id: "slide-fade", durationMs: 600 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: "paper-cut.ogg",
  badgeStyle: "pill",
};
