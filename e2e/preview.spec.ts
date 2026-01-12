import { test, expect } from "@playwright/test";

/**
 * Preview Mode E2E tests.
 * Tests the preview experience when users have no API keys configured.
 * These tests run with authenticated state (storageState from setup).
 */

// Mock data for preview tests
const previewModels = [
  {
    id: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    shortName: "GPT-4o Mini",
    provider: "openai",
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6,
    contextLength: 128000,
  },
  {
    id: "anthropic/claude-3.5-haiku",
    name: "Claude 3.5 Haiku",
    shortName: "Claude 3.5 Haiku",
    provider: "anthropic",
    costPerMillionInput: 0.8,
    costPerMillionOutput: 4.0,
    contextLength: 200000,
  },
  {
    id: "google/gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    shortName: "Gemini 2.0 Flash",
    provider: "google",
    costPerMillionInput: 0.1,
    costPerMillionOutput: 0.4,
    contextLength: 1000000,
  },
];

const previewConstraints = {
  maxRounds: 2,
  maxParticipants: 2,
  allowedModels: [
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-haiku",
    "google/gemini-2.0-flash-001",
    "meta-llama/llama-3.1-8b-instruct",
    "mistralai/mistral-small-24b-instruct-2501",
  ],
};

/**
 * Helper to set up common mocks for preview mode
 */
async function setupPreviewMocks(
  page: import("@playwright/test").Page,
  options: {
    runsUsed?: number;
    runsRemaining?: number;
    totalAllowed?: number;
  } = {}
) {
  const { runsUsed = 0, runsRemaining = 3, totalAllowed = 3 } = options;

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

  // Mock preview endpoint - preview enabled with specified runs
  await page.route("**/api/preview", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        enabled: true,
        runsUsed,
        runsRemaining,
        totalAllowed,
        constraints: previewConstraints,
      }),
    });
  });

  // Mock available models endpoint - only preview models available
  await page.route("**/api/models/available", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        models: previewModels,
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

  // Mock OpenRouter models endpoint
  await page.route("**/api/openrouter-models", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        models: previewModels,
        groupedModels: {
          openai: [previewModels[0]],
          anthropic: [previewModels[1]],
          google: [previewModels[2]],
        },
      }),
    });
  });
}

test.describe("Preview Mode", () => {
  test.describe("Preview Banner", () => {
    test("displays preview banner when no API keys and preview enabled", async ({
      page,
    }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });
      await page.goto("/consensus");

      // Should show preview banner with runs available
      await expect(page.getByText("Preview")).toBeVisible();
      await expect(page.getByText("3 of 3 runs available")).toBeVisible();
    });

    test("shows correct run count after using runs", async ({ page }) => {
      await setupPreviewMocks(page, { runsUsed: 1, runsRemaining: 2 });
      await page.goto("/consensus");

      await expect(page.getByText("2 of 3 runs available")).toBeVisible();
    });

    test("shows last run message", async ({ page }) => {
      await setupPreviewMocks(page, { runsUsed: 2, runsRemaining: 1 });
      await page.goto("/consensus");

      await expect(page.getByText("1 of 3 runs available")).toBeVisible();
    });

    test("shows upgrade CTA in banner", async ({ page }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });
      await page.goto("/consensus");

      // Should have Add API Key link to settings
      const addKeyLink = page.getByRole("link", { name: /Add API Key/i });
      await expect(addKeyLink).toBeVisible();
      await expect(addKeyLink).toHaveAttribute("href", "/settings");
    });
  });

  test.describe("Preview Exhausted State", () => {
    test("shows Ready for More card when runs exhausted", async ({ page }) => {
      await setupPreviewMocks(page, { runsUsed: 3, runsRemaining: 0 });
      await page.goto("/consensus");

      // Should show the exhausted card
      await expect(page.getByText("Ready for More?")).toBeVisible();
      await expect(
        page.getByText(/You've used all 3 preview runs/i)
      ).toBeVisible();
    });

    test("shows benefits list when exhausted", async ({ page }) => {
      await setupPreviewMocks(page, { runsUsed: 3, runsRemaining: 0 });
      await page.goto("/consensus");

      // Should list benefits
      await expect(page.getByText("Unlimited consensus runs")).toBeVisible();
      await expect(
        page.getByText(/Use any model from OpenAI, Anthropic, Google/i)
      ).toBeVisible();
    });

    test("shows Configure API Keys button when exhausted", async ({ page }) => {
      await setupPreviewMocks(page, { runsUsed: 3, runsRemaining: 0 });
      await page.goto("/consensus");

      const configureButton = page.getByRole("link", {
        name: /Configure API Keys/i,
      });
      await expect(configureButton).toBeVisible();
      await expect(configureButton).toHaveAttribute("href", "/settings");
    });
  });

  test.describe("Preview UI Controls", () => {
    test("displays prompt input in preview mode", async ({ page }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });
      await page.goto("/consensus");

      const promptInput = page.getByPlaceholder(/What would you like/i);
      await expect(promptInput).toBeVisible();
      await expect(promptInput).toBeEnabled();
    });

    test("submit button is enabled with prompt in preview mode", async ({
      page,
    }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });
      await page.goto("/consensus");

      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("What is the meaning of life?");

      const submitButton = page.getByRole("button", { name: /^Ask$/i });
      await expect(submitButton).toBeEnabled();
    });

    test("prompt input is not shown when preview exhausted", async ({ page }) => {
      await setupPreviewMocks(page, { runsUsed: 3, runsRemaining: 0 });
      await page.goto("/consensus");

      // When exhausted (without active session), the input card is replaced by exhausted card
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await expect(promptInput).not.toBeVisible();

      // Should show exhausted card instead
      await expect(page.getByText("Ready for More?")).toBeVisible();
    });

    test("submit button is not shown when preview exhausted", async ({
      page,
    }) => {
      await setupPreviewMocks(page, { runsUsed: 3, runsRemaining: 0 });
      await page.goto("/consensus");

      // When exhausted (without active session), Ask button is not shown
      const submitButton = page.getByRole("button", { name: /^Ask$/i });
      await expect(submitButton).not.toBeVisible();
    });
  });

  test.describe("Preview Prompt Suggestions", () => {
    test("shows prompt suggestions in preview mode", async ({ page }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });

      // Clear used suggestions
      await page.goto("/consensus");
      await page.evaluate(() =>
        localStorage.removeItem("usedPromptSuggestions")
      );
      await page.reload();

      // Should show at least one suggestion button
      // Using partial match since suggestion text may vary
      const suggestionButtons = page.locator(
        'button:has-text("Implement"), button:has-text("meaning"), button:has-text("technology")'
      );
      await expect(suggestionButtons.first()).toBeVisible();
    });

    test("clicking suggestion fills prompt in preview mode", async ({
      page,
    }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });

      // Clear used suggestions
      await page.goto("/consensus");
      await page.evaluate(() =>
        localStorage.removeItem("usedPromptSuggestions")
      );
      await page.reload();

      // Mock consensus to prevent auto-submit
      await page.route("**/api/consensus", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 100));
        await route.abort();
      });

      // Click a suggestion
      const suggestionButton = page
        .locator('button:has-text("meaning of life")')
        .first();
      if (await suggestionButton.isVisible()) {
        await suggestionButton.click();

        // Prompt should be filled
        const promptInput = page.getByPlaceholder(/What would you like/i);
        await expect(promptInput).not.toHaveValue("");
      }
    });
  });

  test.describe("Preview Mode Submission", () => {
    test("shows loading state during preview submission", async ({ page }) => {
      await setupPreviewMocks(page, { runsRemaining: 3 });

      // Mock consensus endpoint with delay
      await page.route("**/api/consensus", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 5000));
        await route.abort();
      });

      await page.goto("/consensus");

      // Enter prompt and submit
      const promptInput = page.getByPlaceholder(/What would you like/i);
      await promptInput.fill("Test question");
      await page.getByRole("button", { name: /^Ask$/i }).click();

      // Button should show loading state
      await expect(page.getByRole("button", { name: /Asking/i })).toBeDisabled();
    });
  });
});

test.describe("Preview Mode Disabled", () => {
  test("shows NoKeysAlert when preview is disabled and no keys", async ({
    page,
  }) => {
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

    // Mock preview endpoint - preview disabled
    await page.route("**/api/preview", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          enabled: false,
          message: "Preview system is not configured",
        }),
      });
    });

    // Mock available models endpoint - no models
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

    // Should show NoKeysAlert, not preview banner
    await expect(page.getByText("No API Keys Configured")).toBeVisible();
  });
});
