import { describe, expect, it } from "vitest";
import { decode, liveId } from "../../../src/settings/url";

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
    const url = new URL(link, "https://overlune.in");
    expect(url.pathname).toBe(`/o/${overlay}`);
    // Only the query flags the URL format has ever had (STACK.md), and a saved overlay's id well formed (T12.4).
    for (const key of url.searchParams.keys())
      expect(["rm", "canvas", "test", "until", "live"]).toContain(key);
    if (url.searchParams.has("live")) expect(liveId(url.search)).toBe(url.searchParams.get("live"));
    expect(decode(url.hash).ok).toBe(true);
  });
});
