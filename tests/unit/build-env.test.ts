import { describe, expect, it } from "vitest";
// @ts-expect-error: a plain .mjs build script, without type declarations.
import { buildEnv } from "../../scripts/build-env.mjs";

// GitHub Actions builds with the same public settings Cloudflare's build reads from wrangler.jsonc (T15.2).
describe("buildEnv", () => {
  it("gives each environment's VITE_ variables from the real wrangler.jsonc", () => {
    const production: string[] = buildEnv("production");
    expect(production).toContain("VITE_SENTRY_ENVIRONMENT=production");
    expect(production.some((l) => l.startsWith("VITE_SENTRY_DSN=https://"))).toBe(true);
    expect(buildEnv("preview")).toContain("VITE_SENTRY_ENVIRONMENT=staging");
  });

  it("never passes on run-time settings, only VITE_ ones", () => {
    for (const env of ["production", "preview"])
      for (const line of buildEnv(env) as string[]) expect(line).toMatch(/^VITE_/);
  });

  it("reads comments, URLs and trailing commas as Wrangler does", () => {
    const text = `// a comment
{
  "env": {
    "production": {
      // another
      "vars": { "VITE_A": "https://x.example//y", "AUTH_ORIGIN": "https://z", },
    },
  },
}`;
    expect(buildEnv("production", text)).toEqual(["VITE_A=https://x.example//y"]);
  });

  it("refuses an environment that isn't there", () => {
    expect(() => buildEnv("staging")).toThrow("no env.staging.vars");
  });
});
