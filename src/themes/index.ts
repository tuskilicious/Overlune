import { cleanSlate } from "./clean-slate";
import { neonGrid } from "./neon-grid";
import type { Theme, ThemeId } from "./types";

export const themes: Record<ThemeId, Theme> = {
  "clean-slate": cleanSlate,
  "neon-grid": neonGrid,
};

export const defaultThemeId: ThemeId = "clean-slate";
