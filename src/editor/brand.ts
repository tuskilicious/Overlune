import "@fontsource/quicksand/600.css";
import "@fontsource/quicksand/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/700.css";
import { cleanSlate } from "../themes/clean-slate";
import type { Theme } from "../themes/types";
import type { SiteTheme } from "../lib/site-theme";

/**
 * Overlune's own brand colors and fonts (docs/BRAND.md) for the editor and guide chrome.
 * Only the visual tokens differ from Clean Slate; the rest is never read by the chrome.
 * The near-black "night" ground keeps the chrome quiet next to any theme preview.
 */
export const brandChrome: Theme = {
  ...cleanSlate,
  bg: "#05061A", // night
  surface: "#0B0F3C", // deep space
  primary: "#F4F1FF", // moonlight
  accent: "#A45EFC", // lune violet
  text: "#F4F1FF", // moonlight
  textMuted: "#A7A0D6", // haze
  fontHeading: "Quicksand",
  fontBody: "Nunito",
  radius: 12,
  border: "1px solid #24285C",
};

/** The light mode's chrome (2.1): the same brand, flipped, with a deeper violet that keeps AA contrast on light. */
export const brandChromeLight: Theme = {
  ...brandChrome,
  bg: "#F6F4FD",
  surface: "#FFFFFF",
  primary: "#16123A",
  accent: "#7B3FE4",
  text: "#16123A",
  textMuted: "#574F86",
  border: "1px solid #D9D4F0",
};

export const brandFor = (theme: SiteTheme) => (theme === "light" ? brandChromeLight : brandChrome);
