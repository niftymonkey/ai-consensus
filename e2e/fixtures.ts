import { test, expect } from "@playwright/test";

/**
 * Shared test fixtures and data for AI Consensus E2E tests.
 *
 * Tests use Playwright's storageState for authentication:
 * - auth.setup.ts authenticates once using the test Credentials provider
 * - Authenticated tests (consensus, settings, error-handling) run with saved state
 * - Auth tests run unauthenticated to test public pages and redirects
 */

export { test, expect };

/**
 * Common test data for API mocking
 */
export const testData = {
  validApiKeys: {
    openrouter: "sk-or-test-key-12345",
    anthropic: "sk-ant-test-key-12345",
    openai: "sk-test-key-12345",
    google: "AIza-test-key-12345",
  },
  maskedKeys: {
    openrouter: "sk-or-...5678",
    anthropic: null,
    openai: null,
    google: null,
    tavily: null,
  },
  mockModels: [
    {
      id: "anthropic/claude-3-5-sonnet",
      name: "Claude 3.5 Sonnet",
      shortName: "Claude 3.5 Sonnet",
      provider: "anthropic",
      costPerMillionInput: 3.0,
      costPerMillionOutput: 15.0,
      contextLength: 200000,
    },
    {
      id: "openai/gpt-4o",
      name: "GPT-4o",
      shortName: "GPT-4o",
      provider: "openai",
      costPerMillionInput: 2.5,
      costPerMillionOutput: 10.0,
      contextLength: 128000,
    },
    {
      id: "google/gemini-pro",
      name: "Gemini Pro",
      shortName: "Gemini Pro",
      provider: "google",
      costPerMillionInput: 0.5,
      costPerMillionOutput: 1.5,
      contextLength: 1000000,
    },
  ],
};
