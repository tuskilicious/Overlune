import { describe, expect, it } from "vitest";
import { contrast } from "../../../src/lib/contrast";
import { brandChrome as t } from "../../../src/editor/brand";

// The editor chrome uses Overlune's brand tokens (docs/BRAND.md). Error red is set in editor.css.
const error = "#ff8a8a";

describe("editor colors meet WCAG AA", () => {
  it.each([
    ["text", t.text],
    ["muted text", t.textMuted],
    ["accent (status, links)", t.accent],
    ["error", error],
  ])("%s is at least 4.5:1 on the page and on panels", (_, color) => {
    expect(contrast(color, t.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(color, t.surface)).toBeGreaterThanOrEqual(4.5);
  });

  // T6.135: the picked segment's text and the switch's knob are Night on Lune Violet.
  it("Night on Lune Violet (picked segment, switch on) is at least 4.5:1", () => {
    expect(contrast(t.bg, t.accent)).toBeGreaterThanOrEqual(4.5);
  });

  it("control outlines and focus rings are at least 3:1 (WCAG 1.4.11)", () => {
    for (const edge of [t.textMuted, t.accent]) {
      expect(contrast(edge, t.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(edge, t.surface)).toBeGreaterThanOrEqual(3);
    }
  });
});
