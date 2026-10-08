import { describe, expect, it } from "vitest";
import { themes } from "../../../src/themes";
import { themeIds } from "../../../src/themes/types";

// One source of truth for the number of looks (T6.138, the handoff's P0-1): the theme list. Site copy derives it
// (`${themeIds.length} looks`); docs that state it must match it.

const words =
  "two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty".split(
    " ",
  );
/** "16 looks", "sixteen themes", "9 matching looks" and the like ("one theme" is about a single one, not a count). */
const countClaim = new RegExp(
  String.raw`\b(\d+|${words.join("|")})\s+(?:matching\s+)?(?:looks?|themes?)\b`,
  "gi",
);
const claims = (text: string) =>
  [...text.matchAll(countClaim)].map((m) => {
    const n = m[1]!.toLowerCase();
    return { phrase: m[0], n: /\d/.test(n) ? Number(n) : words.indexOf(n) + 2 };
  });

// Read as text at test time (Vite's ?raw), so a new count anywhere in these files is caught.
const docs = import.meta.glob(["/README.md", "/index.html", "/docs/BRAND.md", "/docs/PRD.md"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;
const source = import.meta.glob(["/src/**/*.{ts,tsx,css}"], {
  query: "?raw",
  import: "default",
  eager: true,
}) as Record<string, string>;

describe("the number of looks", () => {
  it.each(Object.entries(docs))("%s states the current count", (_, text) => {
    for (const { phrase, n } of claims(text)) expect(n, phrase).toBe(themeIds.length);
  });

  it("is never typed into the site's code: it's derived from the theme list", () => {
    const typed = Object.entries(source).flatMap(([file, text]) =>
      claims(text).map(({ phrase }) => `${file}: ${phrase}`),
    );
    expect(typed).toEqual([]);
  });

  it("the README lists every look by name", () => {
    const line = docs["/README.md"]!.split("\n").find((l) => /^- \d+ looks:/.test(l))!;
    for (const id of themeIds) expect(line, id).toContain(themes[id].name);
  });

  it("catches a stale count", () => {
    expect(claims("in 9 matching looks").map((c) => c.n)).toEqual([9]);
    expect(claims("Sixteen looks. Every scene matches.").map((c) => c.n)).toEqual([16]);
    expect(claims("each look has its own").length).toBe(0);
  });
});
