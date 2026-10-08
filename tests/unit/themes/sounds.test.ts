import { describe, expect, it } from "vitest";
import { themes } from "../../../src/themes";

// A distinct alert sound per look (T6.142, the handoff's P2-1): `<look id>.ogg` in public/sounds.

const files = Object.keys(import.meta.glob("/public/sounds/*.ogg")).map((f) => f.split("/").pop());

describe("alert sounds", () => {
  it.each(Object.values(themes).map((t) => [t.id, t.alertSound]))(
    "%s's sound (%s) is a file in public/sounds",
    (_, file) => {
      expect(files).toContain(file);
    },
  );

  it("every look has its own sound", () => {
    for (const theme of Object.values(themes))
      expect(theme.alertSound, theme.id).toBe(`${theme.id}.ogg`);
  });
});
