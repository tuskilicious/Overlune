import { abyss } from "./abyss";
import { arcade8bit } from "./arcade-8bit";
import { boldEsports } from "./bold-esports";
import { cleanSlate } from "./clean-slate";
import { cozyCafe } from "./cozy-cafe";
import { daylight } from "./daylight";
import { forestNight } from "./forest-night";
import { neonGrid } from "./neon-grid";
import { pastelCloud } from "./pastel-cloud";
import { vaporwaveSunset } from "./vaporwave-sunset";
import type { Theme, ThemeId } from "./types";

export const themes: Record<ThemeId, Theme> = {
  "clean-slate": cleanSlate,
  "neon-grid": neonGrid,
  "cozy-cafe": cozyCafe,
  "arcade-8bit": arcade8bit,
  "pastel-cloud": pastelCloud,
  "forest-night": forestNight,
  "bold-esports": boldEsports,
  "vaporwave-sunset": vaporwaveSunset,
  daylight,
  abyss,
};

export const defaultThemeId: ThemeId = "clean-slate";
