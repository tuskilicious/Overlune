import "@fontsource/inter/400.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import type { Theme } from "./types";

export const cleanSlate: Theme = {
  id: "clean-slate",
  name: "Clean Slate",
  bg: "#121418",
  surface: "#1C1F26",
  primary: "#E8EAED",
  accent: "#4F8CFF",
  text: "#E8EAED",
  textMuted: "#8A919E",
  fontHeading: "Inter",
  fontBody: "Inter",
  radius: 8,
  border: "1px solid #2A2E37",
  bgEffect: "none",
  enter: { id: "slide-fade", durationMs: 300 },
  exit: { id: "slide-fade", durationMs: 300 },
  alertAnim: "slide-fade",
  alertSound: null,
  badgeStyle: "pill",
};
