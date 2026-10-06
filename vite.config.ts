/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cspForMeta } from "./src/lib/csp-meta";
import { pageHtml, pages } from "./src/lib/page-meta";

// Hosts that ignore public/_headers (Antideploy) still get the CSP and referrer policy.
// Build only: the dev server relies on inline scripts and styles that this CSP blocks.
const securityMeta: Plugin = {
  name: "overlune-security-meta",
  apply: "build",
  transformIndexHtml: () => [
    {
      tag: "meta",
      attrs: {
        "http-equiv": "Content-Security-Policy",
        content: cspForMeta(readFileSync("public/_headers", "utf8")),
      },
      injectTo: "head-prepend",
    },
    { tag: "meta", attrs: { name: "referrer", content: "no-referrer" }, injectTo: "head-prepend" },
  ],
};

// Link previews (T6.87): a copy of index.html per site page with its own title and tags. Cloudflare Pages serves
// guide.html at /guide, so addresses don't change.
const pagePreviews: Plugin = {
  name: "overlune-page-previews",
  apply: "build",
  enforce: "post", // after Vite has written index.html into the bundle
  generateBundle(_, bundle) {
    const index = bundle["index.html"];
    if (index?.type !== "asset") throw new Error("index.html missing from the build");
    for (const path of Object.keys(pages).filter((p) => p !== "/"))
      this.emitFile({
        type: "asset",
        fileName: `${path.slice(1)}.html`,
        source: pageHtml(String(index.source), path),
      });
  },
};

const { version } = JSON.parse(readFileSync("package.json", "utf8")) as { version: string };

export default defineConfig(({ mode }) => {
  // Sentry release, e.g. overlune@1.0.0+319afe4: the version, plus the commit when Cloudflare Pages builds it.
  // A VITE_SENTRY_RELEASE set in the environment still wins.
  const env = loadEnv(mode, ".", ["VITE_SENTRY_RELEASE", "CF_PAGES_COMMIT_SHA"]);
  const commit = env.CF_PAGES_COMMIT_SHA?.slice(0, 7);
  const release = env.VITE_SENTRY_RELEASE || `overlune@${version}${commit ? `+${commit}` : ""}`;
  return {
    plugins: [react(), tailwindcss(), securityMeta, pagePreviews],
    define: { "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(release) },
    build: {
      // Source maps are generated for Sentry but not referenced from the shipped JS.
      // Uploading them to Sentry is a later step (see docs/SENTRY.md).
      sourcemap: "hidden",
      // Never inline small fonts or images as data: URLs. The CSP (font-src/img-src) blocks them.
      assetsInlineLimit: 0,
    },
    test: {
      environment: "node",
      include: ["tests/unit/**/*.test.ts"],
    },
  };
});
