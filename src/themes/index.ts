import { cleanSlate } from "./clean-slate";
import type { Theme, ThemeId } from "./types";

export const themes: Record<ThemeId, Theme> = {
  "clean-slate": cleanSlate,
};

export const defaultThemeId: ThemeId = "clean-slate";
