import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against the real app and a real Postgres.
 * The database is reset to the demo family before the run (tests/global-setup.ts).
 * Run: bun run test:e2e   (starts `next dev` unless one is already on :3000)
 */
export default defineConfig({
  testDir: "tests/e2e",
  globalSetup: "./tests/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : undefined,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "bun run dev",
    url: "http://localhost:3000/sign-in",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
