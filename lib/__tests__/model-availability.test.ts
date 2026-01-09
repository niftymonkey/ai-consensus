/**
 * Model Availability Tests
 *
 * Tests for the /api/models/available endpoint logic.
 * These tests define the expected behavior for model filtering
 * when users have only direct API keys (no OpenRouter).
 */

import { describe, it, expect } from "vitest";
import {
  normalizeModelId,
  mapOpenRouterToDirectId,
  filterAndMapModelsForDirectKeys,
  type ModelBase,
  type ProviderAvailability,
} from "../model-availability";

describe("normalizeModelId", () => {
  describe("removes provider prefix", () => {
    it("strips anthropic/ prefix", () => {
      expect(normalizeModelId("anthropic/claude-3.7-sonnet")).toBe("claude-3-7-sonnet");
    });

    it("strips openai/ prefix", () => {
      expect(normalizeModelId("openai/gpt-4o")).toBe("gpt-4o");
    });

    it("strips google/ prefix", () => {
      expect(normalizeModelId("google/gemini-2.0-flash")).toBe("gemini-2-0-flash");
    });
  });

  describe("normalizes version numbers", () => {
    it("converts dots to hyphens (4.5 -> 4-5)", () => {
      expect(normalizeModelId("claude-opus-4.5")).toBe("claude-opus-4-5");
    });

    it("handles multiple dots (3.5.1 -> 3-5-1)", () => {
      expect(normalizeModelId("model-3.5.1")).toBe("model-3-5-1");
    });
  });

  describe("removes date suffixes", () => {
    it("removes 8-digit date suffix", () => {
      expect(normalizeModelId("claude-3-7-sonnet-20250219")).toBe("claude-3-7-sonnet");
    });

    it("preserves model ID without date suffix", () => {
      expect(normalizeModelId("gpt-4o")).toBe("gpt-4o");
    });
  });

  describe("handles combined cases", () => {
    it("OpenRouter format with dots -> normalized", () => {
      expect(normalizeModelId("anthropic/claude-3.5-haiku")).toBe("claude-3-5-haiku");
    });

    it("Direct format with date -> normalized", () => {
      expect(normalizeModelId("claude-3-5-haiku-20241022")).toBe("claude-3-5-haiku");
    });

    it("Both formats normalize to same value", () => {
      const openRouterFormat = normalizeModelId("anthropic/claude-3.5-haiku");
      const directFormat = normalizeModelId("claude-3-5-haiku-20241022");
      expect(openRouterFormat).toBe(directFormat);
    });
  });

  describe("handles special model variants", () => {
    it("normalizes thinking variants", () => {
      // :thinking suffix should NOT be stripped - it's a different model
      expect(normalizeModelId("anthropic/claude-3.7-sonnet:thinking")).toBe("claude-3-7-sonnet:thinking");
    });

    it("normalizes beta variants", () => {
      expect(normalizeModelId("anthropic/claude-3.7-sonnet:beta")).toBe("claude-3-7-sonnet:beta");
    });
  });

  describe("lowercases for comparison", () => {
    it("lowercases the result", () => {
      expect(normalizeModelId("GPT-4O")).toBe("gpt-4o");
    });
  });
});

describe("mapOpenRouterToDirectId", () => {
  const anthropicModels = [
    "claude-3-7-sonnet-20250219",
    "claude-3-5-haiku-20241022",
    "claude-opus-4-5-20251101",
  ];

  const openaiModels = [
    "gpt-4o",
    "gpt-4o-mini",
    "chatgpt-4o-latest",
  ];

  const availability: ProviderAvailability = {
    anthropic: anthropicModels,
    openai: openaiModels,
    google: ["gemini-2.0-flash-001"],
    errors: {},
  };

  describe("finds matching direct provider ID", () => {
    it("maps OpenRouter Anthropic model to direct ID", () => {
      const result = mapOpenRouterToDirectId("anthropic/claude-3.7-sonnet", "anthropic", availability);
      expect(result).toBe("claude-3-7-sonnet-20250219");
    });

    it("maps OpenRouter OpenAI model to direct ID", () => {
      const result = mapOpenRouterToDirectId("openai/gpt-4o", "openai", availability);
      expect(result).toBe("gpt-4o");
    });

    it("maps model with dots in version", () => {
      const result = mapOpenRouterToDirectId("anthropic/claude-3.5-haiku", "anthropic", availability);
      expect(result).toBe("claude-3-5-haiku-20241022");
    });
  });

  describe("returns null for no match", () => {
    it("returns null for unknown model", () => {
      const result = mapOpenRouterToDirectId("anthropic/claude-2.0-unknown", "anthropic", availability);
      expect(result).toBeNull();
    });

    it("returns null for empty provider availability", () => {
      const emptyAvailability: ProviderAvailability = {
        anthropic: [],
        openai: [],
        google: [],
        errors: {},
      };
      const result = mapOpenRouterToDirectId("anthropic/claude-3.7-sonnet", "anthropic", emptyAvailability);
      expect(result).toBeNull();
    });
  });

  describe("handles special variants", () => {
    it("does NOT match :thinking variant to base model", () => {
      // :thinking is a different model, should not match the base model
      const result = mapOpenRouterToDirectId("anthropic/claude-3.7-sonnet:thinking", "anthropic", availability);
      // Should only match if there's a thinking model in availability
      expect(result).toBeNull();
    });
  });
});

describe("filterAndMapModelsForDirectKeys", () => {
  const sampleModels: ModelBase[] = [
    { id: "anthropic/claude-3.7-sonnet", provider: "anthropic", name: "Claude 3.7 Sonnet" },
    { id: "anthropic/claude-3.7-sonnet:thinking", provider: "anthropic", name: "Claude 3.7 Sonnet (Thinking)" },
    { id: "anthropic/claude-3.5-haiku", provider: "anthropic", name: "Claude 3.5 Haiku" },
    { id: "openai/gpt-4o", provider: "openai", name: "GPT-4o" },
    { id: "google/gemini-2.0-flash", provider: "google", name: "Gemini 2.0 Flash" },
    { id: "meta-llama/llama-4-scout", provider: "meta-llama", name: "Llama 4 Scout" },
  ];

  const availability: ProviderAvailability = {
    anthropic: ["claude-3-7-sonnet-20250219", "claude-3-5-haiku-20241022"],
    openai: ["gpt-4o", "gpt-4o-mini"],
    google: ["gemini-2.0-flash-001"],
    errors: {},
  };

  const hasKeys = {
    anthropic: true,
    openai: true,
    google: true,
  };

  describe("filters to direct providers only", () => {
    it("excludes non-direct providers like meta-llama", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      expect(result.find(m => m.provider === "meta-llama")).toBeUndefined();
    });

    it("includes models from providers with keys", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      expect(result.some(m => m.provider === "anthropic")).toBe(true);
      expect(result.some(m => m.provider === "openai")).toBe(true);
      expect(result.some(m => m.provider === "google")).toBe(true);
    });

    it("excludes providers without keys", () => {
      const limitedKeys = { anthropic: true, openai: false, google: false };
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, limitedKeys);
      expect(result.every(m => m.provider === "anthropic")).toBe(true);
    });
  });

  describe("maps to direct provider IDs", () => {
    it("returns direct provider ID format", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      const claudeModel = result.find(m => m.name === "Claude 3.7 Sonnet");
      expect(claudeModel?.id).toBe("claude-3-7-sonnet-20250219");
    });

    it("does NOT include OpenRouter format IDs", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      expect(result.every(m => !m.id.includes("/"))).toBe(true);
    });
  });

  describe("CRITICAL: no duplicate model IDs", () => {
    it("returns unique model IDs only", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      const ids = result.map(m => m.id);
      const uniqueIds = [...new Set(ids)];
      expect(ids.length).toBe(uniqueIds.length);
    });

    it("does not create duplicates when multiple OpenRouter models match same direct ID", () => {
      // Both claude-3.7-sonnet and claude-3.7-sonnet:thinking might try to match
      // claude-3-7-sonnet-20250219 - only one should be included
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      const claudeSonnetModels = result.filter(m => m.id === "claude-3-7-sonnet-20250219");
      expect(claudeSonnetModels.length).toBeLessThanOrEqual(1);
    });
  });

  describe("excludes models not available in provider API", () => {
    it("excludes models not returned by provider availability check", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      // :thinking variant is not in availability, should be excluded
      const thinkingModel = result.find(m => m.name.includes("Thinking"));
      expect(thinkingModel).toBeUndefined();
    });
  });

  describe("preserves model metadata", () => {
    it("preserves model name", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      const gptModel = result.find(m => m.id === "gpt-4o");
      expect(gptModel?.name).toBe("GPT-4o");
    });

    it("preserves provider", () => {
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, hasKeys);
      const gptModel = result.find(m => m.id === "gpt-4o");
      expect(gptModel?.provider).toBe("openai");
    });
  });

  describe("handles empty inputs", () => {
    it("returns empty array for empty models", () => {
      const result = filterAndMapModelsForDirectKeys([], availability, hasKeys);
      expect(result).toHaveLength(0);
    });

    it("returns empty array for no keys", () => {
      const noKeys = { anthropic: false, openai: false, google: false };
      const result = filterAndMapModelsForDirectKeys(sampleModels, availability, noKeys);
      expect(result).toHaveLength(0);
    });
  });
});
