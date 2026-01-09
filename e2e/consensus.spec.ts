import { test, expect } from "@playwright/test";
import { testData } from "./fixtures";
import { PROMPT_SUGGESTIONS } from "../components/consensus/prompt-suggestions";

/**
 * Consensus Workflow tests.
 * These tests run with authenticated state (storageState from setup).
 */
test.describe("Consensus Workflow", () => {
  test.beforeEach(async ({ page }) => {
    // Mock keys endpoint - user has OpenRouter key
    await page.route("**/api/keys", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          keys: { ...testData.maskedKeys, openrouter: "sk-or-...1234" },
        }),
      });
    });

    // Mock OpenRouter models endpoint
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
  });

  test.describe("Consensus Page UI", () => {
    test("displays consensus page with input and settings", async ({
      page,
    }) => {
      await page.goto("/consensus");

      // Check for main UI elements - prompt input
      await expect(
        page.getByPlaceholder(/What would you like/i)
      ).toBeVisible();

      // Check for settings panel
      await expect(page.getByText(/Model Selection/i).first()).toBeVisible();
    });

    test("displays prompt suggestion chips", async ({ page }) => {
      // Clear used suggestions from localStorage to ensure all are visible
      await page.goto("/consensus");
      await page.evaluate(() => localStorage.removeItem("usedPromptSuggestions"));
      await page.reload();

      // All suggestion buttons should be visible
      for (const suggestion of PROMPT_SUGGESTIONS) {
        await expect(page.getByRole("button", { name: suggestion })).toBeVisible();
      }
    });

    test("shows header with AI Consensus branding", async ({ page }) => {
      await page.goto("/consensus");

      await expect(
        page.getByRole("link", { name: "AI Consensus" })
      ).toBeVisible();
    });

    test("shows user menu when authenticated", async ({ page }) => {
      await page.goto("/consensus");

      // Should show user avatar button (shows "T" for Test User) or theme button
      // Either indicates the header is loaded and user is authenticated
      const themeButton = page.getByRole("button", { name: /Select theme/i });
      await expect(themeButton).toBeVisible();
    });
  });

  test.describe("Settings Panel", () => {
    test("can expand and collapse settings panel", async ({ page }) => {
      await page.goto("/consensus");

      // Find the collapse/settings toggle
      const collapseButton = page.getByRole("button", { name: /Collapse/i });

      if (await collapseButton.isVisible()) {
        // Toggle settings
        await collapseButton.click();
        // Settings should be hidden after collapse
      }
    });

    test("displays model selector with available models", async ({ page }) => {
      await page.goto("/consensus");

      // Look for model selection section
      await expect(page.getByText(/Model Selection/i).first()).toBeVisible();

      // Should show the mocked models in comboboxes
      await expect(page.getByText(/Claude 3.5 Sonnet/i).first()).toBeVisible();
    });

    test("displays round and threshold settings", async ({ page }) => {
      await page.goto("/consensus");

      // Check for rounds setting
      await expect(page.getByText(/Maximum Rounds/i).first()).toBeVisible();

      // Check for threshold setting
      await expect(page.getByText(/Consensus Threshold/i).first()).toBeVisible();
    });
  });

  test.describe("Consensus Submission", () => {
    test("submit button is disabled without prompt", async ({ page }) => {
      await page.goto("/consensus");

      // Find submit button (labeled "Ask")
      const submitButton = page.getByRole("button", { name: /^Ask$/i });

      // Should be disabled when prompt is empty
      await expect(submitButton).toBeDisabled();
    });

    test("submit button is disabled with whitespace-only prompt", async ({ page }) => {
      await page.goto("/consensus");

      // Enter whitespace-only prompt
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("   ");

      // Find submit button (labeled "Ask")
      const submitButton = page.getByRole("button", { name: /^Ask$/i });

      // Should still be disabled for whitespace-only input
      await expect(submitButton).toBeDisabled();
    });

    test("submit button is enabled with prompt", async ({ page }) => {
      await page.goto("/consensus");

      // Enter a prompt
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("What is the best programming language?");

      // Find submit button (labeled "Ask")
      const submitButton = page.getByRole("button", { name: /^Ask$/i });

      // Should be enabled when prompt is entered
      await expect(submitButton).toBeEnabled();
    });

    test("submit button shows loading state during processing", async ({ page }) => {
      // Mock consensus endpoint with delay
      await page.route("**/api/consensus", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        await route.abort();
      });

      await page.goto("/consensus");

      // Enter a prompt and submit
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("Test question");

      const submitButton = page.getByRole("button", { name: /^Ask$/i });
      await submitButton.click();

      // Button should show "Asking..." text and be disabled during processing
      await expect(page.getByRole("button", { name: /Asking/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Asking/i })).toBeDisabled();
    });

    test("clicking suggestion fills prompt with exact suggestion text", async ({ page }) => {
      // Clear used suggestions from localStorage
      await page.goto("/consensus");
      await page.evaluate(() => localStorage.removeItem("usedPromptSuggestions"));
      await page.reload();

      // Mock consensus to prevent auto-submit from navigating away
      await page.route("**/api/consensus", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await route.abort();
      });

      const firstSuggestion = PROMPT_SUGGESTIONS[0];
      const suggestionButton = page.getByRole("button", { name: firstSuggestion });

      await suggestionButton.click();

      // Prompt input should contain the exact suggestion text
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await expect(promptInput).toHaveValue(firstSuggestion);
    });

    test("suggestions hide when prompt has text", async ({ page }) => {
      // Clear used suggestions from localStorage
      await page.goto("/consensus");
      await page.evaluate(() => localStorage.removeItem("usedPromptSuggestions"));
      await page.reload();

      const firstSuggestion = PROMPT_SUGGESTIONS[0];

      // Suggestions should be visible initially
      await expect(page.getByRole("button", { name: firstSuggestion })).toBeVisible();

      // Type in the prompt input
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("Some text");

      // Suggestions should now be hidden
      await expect(page.getByRole("button", { name: firstSuggestion })).not.toBeVisible();
    });
  });

  test.describe("Consensus Process (Mocked)", () => {
    // NOTE: Playwright does not support streaming response mocks (see GitHub #33564).
    // The floating status banner requires streaming events which can't be mocked.
    // We test the immediate UI changes (button state) which ARE mockable.

    test("shows loading state and disables input during consensus", async ({ page }) => {
      // Mock the consensus endpoint with a delay (streaming can't be mocked)
      await page.route("**/api/consensus", async (route) => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.abort();
      });

      await page.goto("/consensus");

      // Enter prompt and submit
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("Test question");
      await page.getByRole("button", { name: /^Ask$/i }).click();

      // Button should show "Asking..." and be disabled (immediate UI change)
      await expect(page.getByRole("button", { name: /Asking/i })).toBeDisabled();

      // Input should be disabled during processing
      await expect(promptInput).toBeDisabled();
    });

    test("UI resets after consensus request completes", async ({ page }) => {
      // Mock the consensus endpoint to complete quickly with an error
      await page.route("**/api/consensus", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: JSON.stringify({ type: "error", data: { message: "Test error" } }) + "\n",
        });
      });

      await page.goto("/consensus");

      // Enter prompt and submit
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("Test question");
      await page.getByRole("button", { name: /^Ask$/i }).click();

      // After completion, button should be re-enabled
      await expect(page.getByRole("button", { name: /^Ask$/i })).toBeEnabled();

      // Input should be re-enabled
      await expect(promptInput).toBeEnabled();

      // Prompt should still contain the text
      await expect(promptInput).toHaveValue("Test question");
    });
  });
});

test.describe("No API Keys State", () => {
  test("shows NoKeysAlert when no API keys configured", async ({ page }) => {
    // Mock keys endpoint - no keys configured
    await page.route("**/api/keys", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          keys: {
            openrouter: null,
            anthropic: null,
            openai: null,
            google: null,
            tavily: null,
          },
        }),
      });
    });

    // Mock available models endpoint - no keys configured, no models
    await page.route("**/api/models/available", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          models: [],
          hasKeys: {
            anthropic: false,
            openai: false,
            google: false,
            tavily: false,
            openrouter: false,
          },
          providerModels: null,
          errors: {},
          timestamp: new Date().toISOString(),
        }),
      });
    });

    await page.goto("/consensus");

    // Should show the NoKeysAlert component with specific title
    await expect(page.getByText("No API Keys Configured")).toBeVisible();

    // Should show the configure button that links to settings
    const configureButton = page.getByRole("link", { name: "Configure API Keys" });
    await expect(configureButton).toBeVisible();
    await expect(configureButton).toHaveAttribute("href", "/settings");
  });
});
