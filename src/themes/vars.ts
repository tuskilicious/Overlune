import type { CSSProperties } from "react";
import type { Theme } from "./types";

/** Theme tokens as CSS custom properties. Set through React's style prop (CSSOM), which the CSP allows. */
export function themeVars(t: Theme): CSSProperties {
  return {
    "--bg": t.bg,
    "--surface": t.surface,
    "--primary": t.primary,
    "--accent": t.accent,
    "--text": t.text,
    "--text-muted": t.textMuted,
    "--font-heading": `"${t.fontHeading}", system-ui, sans-serif`,
    "--font-body": `"${t.fontBody}", system-ui, sans-serif`,
    "--radius": `${t.radius}px`,
    "--border": t.border,
    "--enter-ms": `${t.enter.durationMs}ms`,
  } as CSSProperties;
}
