import { test, expect } from "@playwright/test";
import { testData } from "./fixtures";

/**
 * Error Handling tests.
 * These tests run with authenticated state (storageState from setup).
 */
test.describe("Error Handling", () => {
  test.describe("Network Errors", () => {
    test("settings page handles keys API failure gracefully", async ({ page }) => {
      // Mock keys endpoint to fail
      await page.route("**/api/keys", async (route) => {
        await route.abort("failed");
      });

      await page.goto("/settings");

      // Page should still load and show structure
      await expect(page).toHaveURL("/settings");
      await expect(page.getByText("Model Provider")).toBeVisible();

      // Note: Current behavior shows loading skeleton indefinitely on failure
      // This verifies the page doesn't crash
    });

    test("consensus page handles keys API failure gracefully", async ({ page }) => {
      // Mock keys endpoint to fail
      await page.route("**/api/keys", async (route) => {
        await route.abort("failed");
      });

      // Mock available models endpoint to fail (since it requires auth/db)
      await page.route("**/api/models/available", async (route) => {
        await route.abort("failed");
      });

      await page.goto("/consensus");

      // Page should still be on consensus URL (not crashed/redirected)
      await expect(page).toHaveURL("/consensus");

      // Should show loading skeleton while waiting for API
      // Note: Current behavior stays in loading state on network failure
    });

    test("consensus page handles models API failure gracefully", async ({ page }) => {
      // Mock keys - user has key
      await page.route("**/api/keys", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            keys: { ...testData.maskedKeys, openrouter: "sk-or-...1234" },
          }),
        });
      });

      // Mock models endpoint to fail (this is what useModels hook calls)
      await page.route("**/api/models/available", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      });

      // Keep legacy endpoint mock for backwards compatibility
      await page.route("**/api/openrouter-models", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Internal server error" }),
        });
      });

      await page.goto("/consensus");

      // Page should still load (doesn't crash)
      await expect(page).toHaveURL("/consensus");

      // When models API fails, hasKeys is unknown, so NoKeysAlert is shown
      // This is graceful degradation - page doesn't crash, shows actionable UI
      await expect(page.getByText("Bring Your Own Key")).toBeVisible();
    });
  });

  test.describe("Consensus Errors", () => {
    test("consensus API error shows toast and resets UI", async ({ page }) => {
      // Mock keys and models
      await page.route("**/api/keys", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            keys: { ...testData.maskedKeys, openrouter: "sk-or-...1234" },
          }),
        });
      });

      // Mock available models endpoint (used by useModels hook)
      await page.route("**/api/models/available", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            models: testData.mockModels,
            hasKeys: {
              anthropic: false,
              openai: false,
              google: false,
              tavily: false,
              openrouter: true,
            },
            providerModels: null,
            errors: {},
            timestamp: new Date().toISOString(),
          }),
        });
      });

      await page.route("**/api/openrouter-models", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            models: testData.mockModels,
            groupedModels: {
              anthropic: [testData.mockModels[0]],
              openai: [testData.mockModels[1]],
              google: [testData.mockModels[2]],
            },
          }),
        });
      });

      // Mock consensus endpoint to return error
      await page.route("**/api/consensus", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({
            error: "An error occurred during consensus generation",
          }),
        });
      });

      await page.goto("/consensus");

      // Enter prompt and submit
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("Test question");
      await page.getByRole("button", { name: /^Ask$/i }).click();

      // Should show error toast with "Consensus failed" message
      await expect(page.getByText("Consensus failed")).toBeVisible();

      // Submit button should be re-enabled (back to "Ask")
      await expect(page.getByRole("button", { name: /^Ask$/i })).toBeEnabled();

      // No loading indicator should be visible
      await expect(page.getByText(/Starting consensus/i)).not.toBeVisible();

      // Prompt should still contain the text
      await expect(promptInput).toHaveValue("Test question");
    });
  });

  test.describe("404 and Missing Pages", () => {
    test("navigating to non-existent page shows 404", async ({ page }) => {
      const response = await page.goto("/non-existent-page");

      // Should return 404 status
      expect(response?.status()).toBe(404);
    });
  });
});
