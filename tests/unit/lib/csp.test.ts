import { describe, expect, it } from "vitest";
import headers from "../../../public/_headers?raw";

// The security policy allows only what's needed (CLAUDE.md §7): this pins every outside host, so adding one is a
// deliberate change here too.
const csp = Object.fromEntries(
  headers
    .match(/Content-Security-Policy: (.*)/)![1]!
    .split(";")
    .map((d) => d.trim().split(/\s+/))
    .map(([name, ...sources]) => [name, sources]),
) as Record<string, string[]>;

describe("Content-Security-Policy", () => {
  it.each([
    // Cloudflare Web Analytics' beacon (T6.143)
    ["script-src", ["'self'", "https://static.cloudflareinsights.com"]],
    // Twitch chat, Sentry, and Cloudflare Web Analytics' reports
    [
      "connect-src",
      [
        "'self'",
        "wss://irc-ws.chat.twitch.tv",
        "https://*.ingest.de.sentry.io",
        "https://cloudflareinsights.com",
      ],
    ],
    ["style-src", ["'self'"]],
    ["font-src", ["'self'"]],
    ["media-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["frame-ancestors", ["'self'"]],
  ])("%s allows exactly what's needed", (directive, sources) => {
    expect(csp[directive]).toEqual(sources);
  });
});
