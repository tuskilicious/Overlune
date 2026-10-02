/// <reference types="vitest/config" />
import { readFileSync } from "node:fs";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cspForMeta } from "./src/lib/csp-meta";

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

export default defineConfig({
  plugins: [react(), tailwindcss(), securityMeta],
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
});
