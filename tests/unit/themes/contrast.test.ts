import { describe, expect, it } from "vitest";
import { contrast } from "../../../src/lib/contrast";
import { themes } from "../../../src/themes";

describe.each(Object.values(themes))("$name contrast on surface (WCAG AA)", (theme) => {
  it.each(["text", "textMuted", "accent"] as const)("%s", (token) => {
    expect(contrast(theme[token], theme.surface)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("contrast", () => {
  it("matches known WCAG ratios", () => {
    expect(contrast("#000000", "#FFFFFF")).toBeCloseTo(21);
    expect(contrast("#777777", "#FFFFFF")).toBeCloseTo(4.48, 2);
    expect(contrast("#123456", "#123456")).toBe(1);
  });
});
