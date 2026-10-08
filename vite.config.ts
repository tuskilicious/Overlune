/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { sentryVitePlugin } from "@sentry/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { pageHtml, pages } from "./src/lib/page-meta.ts";

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
  // SENTRY_AUTH_TOKEN is read here at build time only: nothing from `env` reaches the browser except the release name.
  const env = loadEnv(mode, ".", [
    "VITE_SENTRY_RELEASE",
    "CF_PAGES_COMMIT_SHA",
    "SENTRY_AUTH_TOKEN",
  ]);
  const commit = env.CF_PAGES_COMMIT_SHA?.slice(0, 7);
  const release = env.VITE_SENTRY_RELEASE || `overlune@${version}${commit ? `+${commit}` : ""}`;
  // Source maps for Sentry (T6.92): only when the token is set (Cloudflare's production build). They're uploaded, then
  // deleted, so visitors never download them. Without the token, no maps are made at all.
  const upload = Boolean(env.SENTRY_AUTH_TOKEN);
  return {
    plugins: [
      react(),
      tailwindcss(),
      pagePreviews,
      upload &&
        sentryVitePlugin({
          org: "overlune",
          project: "javascript-react",
          authToken: env.SENTRY_AUTH_TOKEN,
          release: { name: release },
          sourcemaps: { filesToDeleteAfterUpload: ["./dist/**/*.map"] },
          telemetry: false,
        }),
    ],
    define: { "import.meta.env.VITE_SENTRY_RELEASE": JSON.stringify(release) },
    // Compile the lazily loaded pages when the dev server starts, so a first visit to /guide or /privacy is quick
    // (on a busy machine, compiling on demand made e2e tests time out under Vite 8).
    server: {
      warmup: {
        clientFiles: ["./src/editor/*.tsx", "./src/landing/*.tsx", "./src/lib/sentry-sdk.ts"],
      },
    },
    build: {
      // Hidden: not referenced from the shipped JS, and only made when they'll be uploaded (see `upload`).
      sourcemap: upload ? "hidden" : false,
      // Never inline small fonts or images as data: URLs. The CSP (font-src/img-src) blocks them.
      assetsInlineLimit: 0,
      // Keep libraries' /*! license notices: GSAP's license says its notices must not be removed (T6.137).
      rolldownOptions: { output: { comments: { legal: true } } },
    },
    test: {
      environment: "node",
      include: ["tests/unit/**/*.test.ts"],
    },
  };
});
