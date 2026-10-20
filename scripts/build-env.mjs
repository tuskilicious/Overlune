// The build's public settings for a Pages environment, read from wrangler.jsonc (Phase 15, T15.2).
//
// Cloudflare's own build reads the `VITE_*` variables from wrangler.jsonc's environments (STACK.md, "Config"). When
// GitHub Actions builds instead, it takes them from the same place, so they never live in two files. Only `VITE_*`
// names: everything else there is for the Functions at run time, and secrets are never in the file.
//
// Usage: node scripts/build-env.mjs production|preview >> "$GITHUB_ENV"
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/** `VITE_*` variables of wrangler.jsonc's `env.<name>`, as `NAME=value` lines. */
export function buildEnv(name, text = readFileSync("wrangler.jsonc", "utf8")) {
  // TypeScript's parser reads JSON with comments and trailing commas, as Wrangler does.
  const { config, error } = ts.parseConfigFileTextToJson("wrangler.jsonc", text);
  if (error) throw new Error("wrangler.jsonc doesn't parse");
  const vars = config.env?.[name]?.vars;
  if (!vars) throw new Error(`wrangler.jsonc has no env.${name}.vars`);
  return Object.entries(vars)
    .filter(([key]) => key.startsWith("VITE_"))
    .map(([key, value]) => {
      if (/[\r\n]/.test(String(value))) throw new Error(`${key} has a line break`);
      return `${key}=${value}`;
    });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const name = process.argv[2];
  if (name !== "production" && name !== "preview")
    throw new Error("usage: node scripts/build-env.mjs production|preview");
  console.log(buildEnv(name).join("\n"));
}
