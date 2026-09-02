import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pilot",
  fullyParallel: true,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "list",
  use: { baseURL: "http://localhost:3102", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `"${process.execPath}" "${require.resolve("next/dist/bin/next")}" dev -p 3102`,
    url: "http://localhost:3102",
    reuseExistingServer: false,
    env: {
      RAUMLY_PUBLIC_PILOT_MODE: "true",
      RAUMLY_IMAGE_TEST_ENABLED: "false",
      RAUMLY_IMAGE_AI_ENABLED: "false",
      SUPABASE_SERVICE_ROLE_KEY: "",
      GOOGLE_CLOUD_PROJECT: "",
    },
    timeout: 120_000,
  },
});
