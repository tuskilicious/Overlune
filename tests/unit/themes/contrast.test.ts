import { describe, expect, it } from "vitest";
import { themes } from "../../../src/themes";

// WCAG 2.x relative luminance for a #RRGGBB color.
function luminance(hex: string): number {
  const channel = (i: number) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

function contrast(a: string, b: string): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

describe.each(Object.values(themes))("$name contrast on surface (WCAG AA)", (theme) => {
  it.each(["text", "textMuted", "accent"] as const)("%s", (token) => {
    expect(contrast(theme[token], theme.surface)).toBeGreaterThanOrEqual(4.5);
  });
});
