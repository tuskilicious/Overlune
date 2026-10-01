import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { cspForMeta } from "../../../src/lib/csp-meta";

describe("cspForMeta", () => {
  it("takes the real CSP from public/_headers, without frame-ancestors", () => {
    const csp = cspForMeta(readFileSync("public/_headers", "utf8"));
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("connect-src 'self' wss://irc-ws.chat.twitch.tv");
    expect(csp).not.toContain("frame-ancestors");
    expect(csp).not.toMatch(/;\s*$/);
  });

  it("fails the build if the CSP line is missing", () => {
    expect(() => cspForMeta("/*\n  X-Content-Type-Options: nosniff\n")).toThrow();
  });
});
