import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `"${process.execPath}" "${require.resolve("next/dist/bin/next")}" dev -p 3100`,
    url: "http://localhost:3100",
    reuseExistingServer: false,
    env: {
      NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_ci_placeholder",
      RAUMLY_IMAGE_TEST_ENABLED: "false",
      NEXT_PUBLIC_RAUMLY_GUEST_IMAGE_TEST_ENABLED: "true",
      NEXT_PUBLIC_RAUMLY_GUEST_IMAGE_DISPATCH_ENABLED: "true",
      RAUMLY_GUEST_IMAGE_TEST_ENABLED: "true",
      RAUMLY_IMAGE_AI_ENABLED: "false",
      SUPABASE_SERVICE_ROLE_KEY: "",
      GOOGLE_CLOUD_PROJECT: "",
    },
    timeout: 120_000,
  },
});
