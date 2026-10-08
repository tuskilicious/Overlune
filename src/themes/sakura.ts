import type { Theme } from "./types";

/** T6.125: a spring night in Japan. Deep indigo, petals drifting down, a paper lantern's warm glow (after the akari
 *  lanterns: light diffused through washi), and a brush-stroke rule. */
export const sakura: Theme = {
  id: "sakura",
  name: "Sakura",
  bg: "#11152F", // the sakura effect adds the lantern glow and the falling petals
  surface: "#1A1E3D",
  primary: "#FFF3F6", // petal white
  accent: "#FF91B4", // sakura pink
  text: "#F1ECF6",
  textMuted: "#B6AFCC",
  fontHeading: "Shippori Mincho",
  fontBody: "Nunito",
  radius: 12,
  border: "1px solid #2F3566",
  shadow: "0 16px 40px rgba(5, 6, 26, 0.45)",
  bgEffect: "sakura",
  enter: { id: "slide-fade", durationMs: 800 },
  exit: { id: "slide-fade", durationMs: 350 },
  alertAnim: "slide-fade",
  alertSound: "sakura.ogg",
  badgeStyle: "pill",
};
