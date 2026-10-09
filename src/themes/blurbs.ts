import type { ThemeId } from "./types";

/** One line per look (T6.124): what it is, in its own words. The landing page's showcase and the editor's welcome
 *  gallery (T6.154) both use it. */
export const blurbs: Record<ThemeId, string> = {
  "clean-slate": "Quiet and sharp, with one blue accent.",
  "neon-grid": "A glowing grid floor under a dark sky.",
  "cozy-cafe": "Warm paper, window light and rising steam.",
  "arcade-8bit": "Pixel type, scanlines and a blinking cursor.",
  "pastel-cloud": "Soft colors, drifting clouds and a sparkle.",
  "forest-night": "A full moon, fireflies and a pine treeline.",
  "bold-esports": "Condensed type and angled red slabs.",
  "vaporwave-sunset": "A striped sun setting behind the palms.",
  daylight: "A light look with a vermilion disc.",
  abyss: "Deep water where only living things glow.",
  session: "A jazz-anime title card in mustard and ink.",
  shonen: "A manga page, inked and lettered.",
  sakura: "A spring night with petals and a lantern.",
  "skate-deck": "A deck wall in aqua, pink and grip tape.",
  phosphor: "A green terminal glowing at midnight.",
  quest: "A quest log in gold, parchment and embers.",
};
