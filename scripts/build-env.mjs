// The build's public settings for production or a Preview, read from wrangler.jsonc (Phase 15, T15.2; Workers, T12.1).
//
// The site's `VITE_*` variables live beside the Worker's in wrangler.jsonc: production's at the top level, every pull
// request's under `previews`. GitHub Actions builds with the same ones, so they never live in two files. Only `VITE_*`
// names: everything else there is for the API at run time, and secrets are never in the file.
//
// Usage: node scripts/build-env.mjs production|preview >> "$GITHUB_ENV"
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/** `VITE_*` variables for production (the top level) or a Preview (`previews`), as `NAME=value` lines. */
export function buildEnv(name, text = readFileSync("wrangler.jsonc", "utf8")) {
  // TypeScript's parser reads JSON with comments and trailing commas, as Wrangler does.
  const { config, error } = ts.parseConfigFileTextToJson("wrangler.jsonc", text);
  if (error) throw new Error("wrangler.jsonc doesn't parse");
  const vars = { production: config.vars, preview: config.previews?.vars }[name];
  if (!vars) throw new Error(`wrangler.jsonc has no vars for ${name}`);
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
