import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  // Chromium only: it's closest to the browser OBS uses.
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // A dark system, so the site opens in its night mode as it always has (2.1); light-mode tests pick light themselves.
  use: { baseURL: "http://localhost:5173", colorScheme: "dark" },
  webServer: {
    command: "npm run dev -- --strictPort",
    url: "http://localhost:5173",
    reuseExistingServer: true,
  },
});
