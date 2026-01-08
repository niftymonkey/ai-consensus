import { test, expect } from "@playwright/test";
import { testData } from "./fixtures";

/**
 * Settings Page tests.
 * These tests run with authenticated state (storageState from setup).
 */
test.describe("Settings Page", () => {
  test.beforeEach(async ({ page }) => {
    // Mock the keys endpoint
    await page.route("**/api/keys", async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ keys: testData.maskedKeys }),
        });
      } else if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      } else if (route.request().method() === "DELETE") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ success: true }),
        });
      }
    });
  });

  test.describe("Settings UI", () => {
    test("displays settings page with API key sections", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Check page structure
      await expect(page.getByText("Model Provider")).toBeVisible();

      // Check for tab options
      await expect(
        page.getByRole("tab", { name: /OpenRouter/i })
      ).toBeVisible();
      await expect(
        page.getByRole("tab", { name: /Direct Provider Keys/i })
      ).toBeVisible();
    });

    test("shows OpenRouter tab by default", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // OpenRouter tab should be selected
      const openRouterTab = page.getByRole("tab", { name: /OpenRouter/i });
      await expect(openRouterTab).toHaveAttribute("data-state", "active");

      // OpenRouter description should be visible
      await expect(page.getByText("One API key for access to")).toBeVisible();
    });

    test("can switch to Direct Provider Keys tab", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Click on Direct Provider Keys tab
      await page.getByRole("tab", { name: /Direct Provider Keys/i }).click();

      // Should show direct provider inputs
      await expect(page.getByText("Anthropic (Claude)")).toBeVisible();
      await expect(page.getByText("OpenAI (GPT)")).toBeVisible();
      await expect(page.getByText("Google (Gemini)")).toBeVisible();
    });

    test("displays web search section", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Check for web search section
      await expect(page.getByText(/Web Search/i).first()).toBeVisible();
      await expect(page.getByText(/Tavily/i).first()).toBeVisible();
    });

    test("displays legal links", async ({ page }) => {
      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Check for legal links
      const termsLink = page.getByRole("link", { name: /Terms of Service/i });
      const privacyLink = page.getByRole("link", { name: /Privacy Policy/i });

      await expect(termsLink).toBeVisible();
      await expect(privacyLink).toBeVisible();
    });
  });

  test.describe("localStorage Persistence", () => {
    test("hideFreeModels preference persists in localStorage", async ({
      page,
    }) => {
      // Override keys mock to include OpenRouter key
      await page.route("**/api/keys", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            keys: { ...testData.maskedKeys, openrouter: "sk-or-...1234" },
          }),
        });
      });

      await page.goto("/settings");
      await page.waitForLoadState("networkidle");

      // Find and toggle the Hide Free Models switch
      const hideFreeSwitch = page.locator("#hide-free-models");
      await expect(hideFreeSwitch).toBeVisible();

      // Get initial state
      const initialChecked = await hideFreeSwitch.isChecked();

      // Toggle the switch
      await hideFreeSwitch.click();

      // Verify localStorage was updated
      const storedValue = await page.evaluate(() =>
        localStorage.getItem("hideFreeModels")
      );
      expect(storedValue).toBe(initialChecked ? "false" : "true");
    });
  });
});
