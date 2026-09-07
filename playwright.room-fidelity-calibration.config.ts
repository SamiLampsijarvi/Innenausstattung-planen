import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

// The calibration is image-only and must not start the web application.
export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  testMatch: "public-room-fidelity-calibration.spec.ts",
  fullyParallel: false,
  reporter: "line",
  webServer: undefined,
});
