import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

// Kept separate so these rooms are evaluated only after the primary corpus.
export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  testMatch: "public-room-fidelity-holdout.spec.ts",
  fullyParallel: false,
  reporter: "line",
  webServer: undefined,
});
