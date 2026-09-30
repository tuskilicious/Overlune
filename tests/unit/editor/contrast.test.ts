import { describe, expect, it } from "vitest";
import { contrast } from "../../../src/lib/contrast";
import { cleanSlate as t } from "../../../src/themes/clean-slate";

// The editor chrome uses Clean Slate tokens (docs/DESIGN.md). Error red is set in editor.css.
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

  it("control outlines and focus rings are at least 3:1 (WCAG 1.4.11)", () => {
    for (const edge of [t.textMuted, t.accent]) {
      expect(contrast(edge, t.bg)).toBeGreaterThanOrEqual(3);
      expect(contrast(edge, t.surface)).toBeGreaterThanOrEqual(3);
    }
  });
});
