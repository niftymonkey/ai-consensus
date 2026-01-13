import { defineConfig, devices } from "@playwright/test";
import dotenv from "dotenv";
import path from "path";

// Load .env.local for E2E_TEST_PASSWORD and other env vars
dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });

/**
 * Playwright E2E test configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  // Global timeout per test
  timeout: 15000,
  // Expect timeout for assertions
  expect: {
    timeout: 5000,
  },
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    // Action timeout for clicks, fills, etc.
    actionTimeout: 5000,
    // Navigation timeout
    navigationTimeout: 10000,
  },
  projects: [
    // Unauthenticated tests - run first, no auth needed
    // Includes preview tests since preview mode works without authentication
    {
      name: "unauthenticated",
      testMatch: /\/(auth|preview)\.spec\.ts$/,
      use: { ...devices["Desktop Chrome"] },
    },
    // Auth setup project - authenticates and saves state, runs after unauthenticated
    {
      name: "auth-setup",
      testMatch: /.*\.setup\.ts/,
      dependencies: ["unauthenticated"],
    },
    // Authenticated tests - run after auth setup with saved auth state
    {
      name: "authenticated",
      testMatch: /\/(consensus|settings|error-handling)\.spec\.ts$/,
      dependencies: ["auth-setup"],
      use: {
        ...devices["Desktop Chrome"],
        storageState: "playwright/.auth/user.json",
      },
    },
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
