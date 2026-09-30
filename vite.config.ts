/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // Source maps are generated for Sentry but not referenced from the shipped JS.
    // Uploading them to Sentry is a later step (see docs/SENTRY.md).
    sourcemap: "hidden",
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
