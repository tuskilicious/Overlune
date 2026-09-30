import { cleanSlate } from "./clean-slate";
import { cozyCafe } from "./cozy-cafe";
import { neonGrid } from "./neon-grid";
import type { Theme, ThemeId } from "./types";

export const themes: Record<ThemeId, Theme> = {
  "clean-slate": cleanSlate,
  "neon-grid": neonGrid,
  "cozy-cafe": cozyCafe,
};

export const defaultThemeId: ThemeId = "clean-slate";
