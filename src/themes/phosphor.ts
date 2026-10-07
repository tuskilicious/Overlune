import type { Theme } from "./types";

/** T6.127: a green-phosphor terminal at midnight. One ink, a faint boot log, lines that land with a bloom and leave
 *  an afterimage, and a breathing cursor. */
export const phosphor: Theme = {
  id: "phosphor",
  name: "Phosphor",
  bg: "#040A05",
  surface: "#07120A",
  primary: "#9DFFAE",
  accent: "#4DFF78",
  text: "#B9F5C6",
  textMuted: "#73B583",
  fontHeading: "JetBrains Mono",
  fontBody: "JetBrains Mono",
  radius: 2,
  border: "1px solid #1C4A27",
  shadow: "0 0 32px rgba(77, 255, 120, 0.08)",
  bgEffect: "phosphor",
  enter: { id: "steps", durationMs: 450 },
  exit: { id: "slide-fade", durationMs: 200 },
  alertAnim: "steps",
  alertSound: "neon-grid.ogg",
  badgeStyle: "pill",
};
