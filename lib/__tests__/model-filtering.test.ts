/**
 * Model Filtering Tests
 *
 * Tests for filtering available models based on API keys
 * and validating model selections.
 */

import { describe, it, expect } from "vitest";
import {
  filterAvailableModels,
  validateModelSelections,
  type Model,
  type ModelSelection,
  type KeySet,
} from "../model-filtering";

// Sample models for testing - representative of OpenRouter catalog
const sampleModels: Model[] = [
  // Big 3 providers
  { id: "anthropic/claude-3.7-sonnet", provider: "anthropic", name: "Claude 3.7 Sonnet" },
  { id: "anthropic/claude-3.5-haiku", provider: "anthropic", name: "Claude 3.5 Haiku" },
  { id: "openai/gpt-4o", provider: "openai", name: "GPT-4o" },
  { id: "openai/gpt-4o-mini", provider: "openai", name: "GPT-4o Mini" },
  { id: "google/gemini-2.5-flash", provider: "google", name: "Gemini 2.5 Flash" },
  { id: "google/gemini-2.5-pro", provider: "google", name: "Gemini 2.5 Pro" },
  // Non-direct providers (OpenRouter only)
  { id: "meta-llama/llama-4-scout", provider: "meta-llama", name: "Llama 4 Scout" },
  { id: "meta-llama/llama-3.3-70b-instruct", provider: "meta-llama", name: "Llama 3.3 70B" },
  { id: "mistralai/mistral-large-2512", provider: "mistralai", name: "Mistral Large" },
  { id: "deepseek/deepseek-v3.2", provider: "deepseek", name: "DeepSeek V3.2" },
  { id: "qwen/qwen3-vl-32b-instruct", provider: "qwen", name: "Qwen 3 VL 32B" },
  { id: "x-ai/grok-4.1-fast", provider: "x-ai", name: "Grok 4.1 Fast" },
  { id: "z-ai/glm-4.7", provider: "z-ai", name: "GLM 4.7" },
  { id: "cohere/command-r-plus", provider: "cohere", name: "Command R+" },
  { id: "perplexity/sonar-pro-search", provider: "perplexity", name: "Sonar Pro" },
];

describe("filterAvailableModels", () => {
  describe("with no keys", () => {
    const noKeys: KeySet = { anthropic: null, openai: null, google: null, openrouter: null };

    it("returns empty array when no keys configured", () => {
      expect(filterAvailableModels(sampleModels, noKeys)).toHaveLength(0);
    });
  });

  describe("with only OpenRouter key", () => {
    const onlyOpenRouter: KeySet = { anthropic: null, openai: null, google: null, openrouter: "or-key" };

    it("returns all models", () => {
      const result = filterAvailableModels(sampleModels, onlyOpenRouter);
      expect(result).toHaveLength(sampleModels.length);
    });

    it("includes models from all providers", () => {
      const result = filterAvailableModels(sampleModels, onlyOpenRouter);
      const providers = new Set(result.map((m) => m.provider));
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("google")).toBe(true);
      expect(providers.has("meta-llama")).toBe(true);
      expect(providers.has("mistralai")).toBe(true);
      expect(providers.has("deepseek")).toBe(true);
      expect(providers.has("x-ai")).toBe(true);
      expect(providers.has("z-ai")).toBe(true);
    });
  });

  describe("with single direct key", () => {
    const onlyAnthropic: KeySet = { anthropic: "ant-key", openai: null, google: null, openrouter: null };
    const onlyOpenAI: KeySet = { anthropic: null, openai: "oai-key", google: null, openrouter: null };
    const onlyGoogle: KeySet = { anthropic: null, openai: null, google: "goog-key", openrouter: null };

    it("returns only Anthropic models with Anthropic key", () => {
      const result = filterAvailableModels(sampleModels, onlyAnthropic);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.provider === "anthropic")).toBe(true);
    });

    it("returns only OpenAI models with OpenAI key", () => {
      const result = filterAvailableModels(sampleModels, onlyOpenAI);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.provider === "openai")).toBe(true);
    });

    it("returns only Google models with Google key", () => {
      const result = filterAvailableModels(sampleModels, onlyGoogle);
      expect(result.length).toBeGreaterThan(0);
      expect(result.every((m) => m.provider === "google")).toBe(true);
    });

    it("does not include non-direct providers without OpenRouter", () => {
      const result = filterAvailableModels(sampleModels, onlyAnthropic);
      const providers = new Set(result.map((m) => m.provider));
      expect(providers.has("meta-llama")).toBe(false);
      expect(providers.has("mistralai")).toBe(false);
      expect(providers.has("deepseek")).toBe(false);
    });
  });

  describe("with multiple direct keys (no OpenRouter)", () => {
    const anthropicAndOpenAI: KeySet = { anthropic: "ant-key", openai: "oai-key", google: null, openrouter: null };
    const allDirect: KeySet = { anthropic: "ant-key", openai: "oai-key", google: "goog-key", openrouter: null };

    it("returns models for all providers with keys", () => {
      const result = filterAvailableModels(sampleModels, anthropicAndOpenAI);
      const providers = new Set(result.map((m) => m.provider));
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("google")).toBe(false);
    });

    it("returns models for all three direct providers", () => {
      const result = filterAvailableModels(sampleModels, allDirect);
      const providers = new Set(result.map((m) => m.provider));
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("openai")).toBe(true);
      expect(providers.has("google")).toBe(true);
      // Still no non-direct providers without OpenRouter
      expect(providers.has("meta-llama")).toBe(false);
    });
  });

  describe("with direct key + OpenRouter", () => {
    const anthropicAndOpenRouter: KeySet = { anthropic: "ant-key", openai: null, google: null, openrouter: "or-key" };

    it("returns all models (OpenRouter provides full access)", () => {
      const result = filterAvailableModels(sampleModels, anthropicAndOpenRouter);
      expect(result).toHaveLength(sampleModels.length);
    });

    it("includes both direct providers and OpenRouter-only providers", () => {
      const result = filterAvailableModels(sampleModels, anthropicAndOpenRouter);
      const providers = new Set(result.map((m) => m.provider));
      expect(providers.has("anthropic")).toBe(true);
      expect(providers.has("meta-llama")).toBe(true);
      expect(providers.has("mistralai")).toBe(true);
    });
  });

  describe("with all keys", () => {
    const allKeys: KeySet = { anthropic: "ant-key", openai: "oai-key", google: "goog-key", openrouter: "or-key" };

    it("returns all models", () => {
      const result = filterAvailableModels(sampleModels, allKeys);
      expect(result).toHaveLength(sampleModels.length);
    });
  });

  describe("edge cases", () => {
    it("handles empty model list", () => {
      const keys: KeySet = { anthropic: null, openai: null, google: null, openrouter: "or-key" };
      expect(filterAvailableModels([], keys)).toHaveLength(0);
    });

    it("preserves model order", () => {
      const keys: KeySet = { anthropic: null, openai: null, google: null, openrouter: "or-key" };
      const result = filterAvailableModels(sampleModels, keys);
      expect(result[0].id).toBe(sampleModels[0].id);
    });
  });
});

describe("validateModelSelections", () => {
  const available: Model[] = [
    { id: "anthropic/claude-3.7-sonnet", provider: "anthropic", name: "Claude 3.7 Sonnet" },
    { id: "openai/gpt-4o", provider: "openai", name: "GPT-4o" },
    { id: "meta-llama/llama-4-scout", provider: "meta-llama", name: "Llama 4 Scout" },
  ];

  describe("with valid selections", () => {
    it("returns all selections unchanged when all are valid", () => {
      const selections: ModelSelection[] = [
        { id: "model-1", modelId: "anthropic/claude-3.7-sonnet", provider: "anthropic", label: "Claude" },
        { id: "model-2", modelId: "openai/gpt-4o", provider: "openai", label: "GPT" },
      ];
      const result = validateModelSelections(selections, available);
      expect(result).toHaveLength(2);
      expect(result).toEqual(selections);
    });

    it("returns single valid selection", () => {
      const selections: ModelSelection[] = [
        { id: "model-1", modelId: "anthropic/claude-3.7-sonnet", provider: "anthropic", label: "Claude" },
      ];
      const result = validateModelSelections(selections, available);
      expect(result).toHaveLength(1);
    });
  });

  describe("with invalid selections", () => {
    it("filters out selections that are no longer available", () => {
      const selections: ModelSelection[] = [
        { id: "model-1", modelId: "anthropic/claude-3.7-sonnet", provider: "anthropic", label: "Claude" },
        { id: "model-2", modelId: "google/gemini-2.5-flash", provider: "google", label: "Gemini" }, // Not in available
      ];
      const result = validateModelSelections(selections, available);
      expect(result).toHaveLength(1);
      expect(result[0].modelId).toBe("anthropic/claude-3.7-sonnet");
    });

    it("returns empty array when all selections are invalid", () => {
      const selections: ModelSelection[] = [
        { id: "model-1", modelId: "google/gemini-2.5-flash", provider: "google", label: "Gemini" },
        { id: "model-2", modelId: "cohere/command-r-plus", provider: "cohere", label: "Command R" },
      ];
      const result = validateModelSelections(selections, available);
      expect(result).toHaveLength(0);
    });
  });

  describe("edge cases", () => {
    it("handles empty selections", () => {
      const result = validateModelSelections([], available);
      expect(result).toHaveLength(0);
    });

    it("handles empty available models", () => {
      const selections: ModelSelection[] = [
        { id: "model-1", modelId: "anthropic/claude-3.7-sonnet", provider: "anthropic", label: "Claude" },
      ];
      const result = validateModelSelections(selections, []);
      expect(result).toHaveLength(0);
    });

    it("preserves selection order", () => {
      const selections: ModelSelection[] = [
        { id: "model-2", modelId: "openai/gpt-4o", provider: "openai", label: "GPT" },
        { id: "model-1", modelId: "anthropic/claude-3.7-sonnet", provider: "anthropic", label: "Claude" },
      ];
      const result = validateModelSelections(selections, available);
      expect(result[0].id).toBe("model-2");
      expect(result[1].id).toBe("model-1");
    });
  });
});
