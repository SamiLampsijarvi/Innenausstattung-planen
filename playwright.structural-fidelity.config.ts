import { defineConfig } from "@playwright/test";
import baseConfig from "./playwright.config";

// Structural image checks are local and do not need a running website.
export default defineConfig({
  ...baseConfig,
  testDir: "./tests/e2e",
  testMatch: "structural-fidelity.spec.ts",
  fullyParallel: false,
  reporter: "line",
  webServer: undefined,
});
