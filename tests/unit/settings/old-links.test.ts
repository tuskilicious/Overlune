import { describe, expect, it } from "vitest";
import { decode } from "../../../src/settings/url";

// Every saved real link from every schema version (tests/fixtures/links/README.md).
// Old links must keep loading forever: the overlay URL is a public contract (CLAUDE.md).
interface Fixture {
  overlay: string;
  created: string;
  link: string;
}

const fixtures = import.meta.glob<Fixture>("../../fixtures/links/**/*.json", {
  eager: true,
  import: "default",
});

describe("saved links from every schema version still load", () => {
  it("finds the fixtures", () => {
    expect(Object.keys(fixtures).length).toBeGreaterThan(0);
  });

  it.each(Object.entries(fixtures))("%s", (_, { overlay, link }) => {
    const hashAt = link.indexOf("#");
    expect(link.slice(0, hashAt)).toBe(`/o/${overlay}`);
    expect(decode(link.slice(hashAt)).ok).toBe(true);
  });
});
