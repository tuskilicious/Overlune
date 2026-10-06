import type { Theme } from "./types";

/** The light look (T6.89): cool paper, ink type and one vermilion accent. Contrast is AA on both bg and surface. */
export const daylight: Theme = {
  id: "daylight",
  name: "Daylight",
  bg: "#EEF1F6",
  surface: "#FFFFFF",
  primary: "#141821", // titles are ink, not color
  accent: "#C93A1C",
  text: "#141821",
  textMuted: "#5B6272",
  fontHeading: "Space Grotesk",
  fontBody: "Nunito Sans",
  radius: 14,
  border: "1px solid #D9DEE7",
  shadow: "0 10px 30px rgba(20, 24, 33, 0.10)",
  bgEffect: "none",
  enter: { id: "slide-fade", durationMs: 350 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: "clean-slate.ogg",
  badgeStyle: "pill",
};
