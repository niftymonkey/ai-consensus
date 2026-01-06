/**
 * Model Routing Tests
 *
 * Tests for the core routing logic that determines:
 * 1. How to extract provider from model IDs
 * 2. How to extract direct model IDs from OpenRouter format
 * 3. Which route (direct vs OpenRouter) to use based on available keys
 */

import { describe, it, expect } from "vitest";
import {
  extractDirectModelId,
  extractProvider,
  getRouteForModel,
  canAccessModel,
  type KeySet,
} from "../model-routing";

describe("extractDirectModelId", () => {
  it("extracts model ID from OpenRouter format", () => {
    expect(extractDirectModelId("openai/gpt-4o")).toBe("gpt-4o");
    expect(extractDirectModelId("anthropic/claude-3.7-sonnet")).toBe("claude-3.7-sonnet");
    expect(extractDirectModelId("google/gemini-2.5-flash")).toBe("gemini-2.5-flash");
  });

  it("returns input unchanged if already direct format (no slash)", () => {
    expect(extractDirectModelId("gpt-4o")).toBe("gpt-4o");
    expect(extractDirectModelId("claude-3.7-sonnet")).toBe("claude-3.7-sonnet");
  });

  it("handles nested provider paths correctly", () => {
    // Some OpenRouter models have nested paths like meta-llama/llama-3.1-70b-instruct
    expect(extractDirectModelId("meta-llama/llama-3.1-70b-instruct")).toBe("llama-3.1-70b-instruct");
  });
});

describe("extractProvider", () => {
  describe("from OpenRouter format (has slash)", () => {
    it("extracts provider from big 3", () => {
      expect(extractProvider("openai/gpt-4o")).toBe("openai");
      expect(extractProvider("anthropic/claude-3.7-sonnet")).toBe("anthropic");
      expect(extractProvider("google/gemini-2.5-flash")).toBe("google");
    });

    it("extracts meta-llama provider", () => {
      expect(extractProvider("meta-llama/llama-3.1-70b")).toBe("meta-llama");
      expect(extractProvider("meta-llama/llama-4-scout")).toBe("meta-llama");
      expect(extractProvider("meta-llama/llama-3.3-70b-instruct")).toBe("meta-llama");
    });

    it("extracts mistralai provider", () => {
      expect(extractProvider("mistralai/mistral-large")).toBe("mistralai");
      expect(extractProvider("mistralai/mistral-small-creative")).toBe("mistralai");
      expect(extractProvider("mistralai/devstral-2512")).toBe("mistralai");
      expect(extractProvider("mistralai/ministral-8b-2512")).toBe("mistralai");
    });

    it("extracts deepseek provider", () => {
      expect(extractProvider("deepseek/deepseek-chat")).toBe("deepseek");
      expect(extractProvider("deepseek/deepseek-v3.2")).toBe("deepseek");
      expect(extractProvider("deepseek/deepseek-v3.2-speciale")).toBe("deepseek");
    });

    it("extracts qwen provider", () => {
      expect(extractProvider("qwen/qwen3-vl-32b-instruct")).toBe("qwen");
      expect(extractProvider("qwen/qwen3-vl-8b-thinking")).toBe("qwen");
    });

    it("extracts x-ai (Grok) provider", () => {
      expect(extractProvider("x-ai/grok-4.1-fast")).toBe("x-ai");
      expect(extractProvider("x-ai/grok-2")).toBe("x-ai");
    });

    it("extracts z-ai (GLM) provider", () => {
      expect(extractProvider("z-ai/glm-4.7")).toBe("z-ai");
      expect(extractProvider("z-ai/glm-4.6v")).toBe("z-ai");
    });

    it("extracts cohere provider", () => {
      expect(extractProvider("cohere/command-r-plus")).toBe("cohere");
      expect(extractProvider("cohere/command-r7b-12-2024")).toBe("cohere");
    });

    it("extracts perplexity provider", () => {
      expect(extractProvider("perplexity/sonar-pro-search")).toBe("perplexity");
    });

    it("extracts nvidia provider", () => {
      expect(extractProvider("nvidia/llama-3.1-nemotron-70b-instruct")).toBe("nvidia");
    });

    it("extracts amazon provider", () => {
      expect(extractProvider("amazon/nova-pro-v1")).toBe("amazon");
    });

    it("handles models with :free suffix", () => {
      expect(extractProvider("mistralai/devstral-2512:free")).toBe("mistralai");
      expect(extractProvider("nex-agi/deepseek-v3.1-nex-n1:free")).toBe("nex-agi");
    });

    it("handles unusual provider names", () => {
      expect(extractProvider("nousresearch/hermes-3-llama-3.1-405b")).toBe("nousresearch");
      expect(extractProvider("sao10k/l3.3-euryale-70b")).toBe("sao10k");
      expect(extractProvider("thedrummer/rocinante-12b")).toBe("thedrummer");
    });
  });

  describe("from direct format (no slash) - infers provider", () => {
    it("infers anthropic from claude prefix", () => {
      expect(extractProvider("claude-3.7-sonnet")).toBe("anthropic");
      expect(extractProvider("claude-3-5-haiku-20241022")).toBe("anthropic");
      expect(extractProvider("claude-opus-4-5")).toBe("anthropic");
    });

    it("infers openai from gpt/chatgpt/o-series prefix", () => {
      expect(extractProvider("gpt-4o")).toBe("openai");
      expect(extractProvider("gpt-4-turbo")).toBe("openai");
      expect(extractProvider("gpt-5")).toBe("openai");
      expect(extractProvider("chatgpt-4o-latest")).toBe("openai");
      expect(extractProvider("o1")).toBe("openai");
      expect(extractProvider("o3-mini")).toBe("openai");
      expect(extractProvider("o4-mini")).toBe("openai");
    });

    it("infers google from gemini prefix", () => {
      expect(extractProvider("gemini-2.5-flash")).toBe("google");
      expect(extractProvider("gemini-1.5-pro")).toBe("google");
      expect(extractProvider("gemini-3-pro-preview")).toBe("google");
    });

    it("returns null for unknown direct format models", () => {
      // These would need OpenRouter format to identify provider
      expect(extractProvider("some-unknown-model")).toBeNull();
      expect(extractProvider("llama-3.1-70b")).toBeNull(); // needs meta-llama/ prefix
      expect(extractProvider("mistral-large")).toBeNull(); // needs mistralai/ prefix
    });
  });
});

describe("getRouteForModel", () => {
  const noKeys: KeySet = { anthropic: null, openai: null, google: null, openrouter: null };
  const onlyOpenRouter: KeySet = { anthropic: null, openai: null, google: null, openrouter: "or-key" };
  const onlyAnthropic: KeySet = { anthropic: "ant-key", openai: null, google: null, openrouter: null };
  const anthropicAndOpenRouter: KeySet = { anthropic: "ant-key", openai: null, google: null, openrouter: "or-key" };
  const allDirect: KeySet = { anthropic: "ant-key", openai: "oai-key", google: "goog-key", openrouter: null };
  const allKeys: KeySet = { anthropic: "ant-key", openai: "oai-key", google: "goog-key", openrouter: "or-key" };

  describe("with no keys", () => {
    it("returns null for any model", () => {
      expect(getRouteForModel("openai/gpt-4o", noKeys)).toBeNull();
      expect(getRouteForModel("anthropic/claude-3.7-sonnet", noKeys)).toBeNull();
    });
  });

  describe("with only OpenRouter key", () => {
    it("routes all models through OpenRouter", () => {
      expect(getRouteForModel("openai/gpt-4o", onlyOpenRouter)).toEqual({
        source: "openrouter",
        provider: "openai",
        modelId: "openai/gpt-4o",
      });
    });

    it("keeps OpenRouter format for the modelId", () => {
      const route = getRouteForModel("anthropic/claude-3.7-sonnet", onlyOpenRouter);
      expect(route?.modelId).toBe("anthropic/claude-3.7-sonnet");
    });

    it("routes non-direct providers through OpenRouter", () => {
      expect(getRouteForModel("meta-llama/llama-3.1-70b", onlyOpenRouter)).toEqual({
        source: "openrouter",
        provider: "meta-llama",
        modelId: "meta-llama/llama-3.1-70b",
      });
    });
  });

  describe("with only direct key (no OpenRouter)", () => {
    it("uses direct key when provider matches", () => {
      expect(getRouteForModel("anthropic/claude-3.7-sonnet", onlyAnthropic)).toEqual({
        source: "direct",
        provider: "anthropic",
        modelId: "claude-3.7-sonnet", // Extracted for direct API call
      });
    });

    it("returns null when provider doesn't match", () => {
      expect(getRouteForModel("openai/gpt-4o", onlyAnthropic)).toBeNull();
    });

    it("returns null for non-direct providers", () => {
      expect(getRouteForModel("meta-llama/llama-3.1-70b", onlyAnthropic)).toBeNull();
    });
  });

  describe("with direct key + OpenRouter (priority test)", () => {
    it("prefers direct key over OpenRouter for matching provider", () => {
      const route = getRouteForModel("anthropic/claude-3.7-sonnet", anthropicAndOpenRouter);
      expect(route?.source).toBe("direct");
      expect(route?.modelId).toBe("claude-3.7-sonnet");
    });

    it("falls back to OpenRouter for non-matching direct providers", () => {
      const route = getRouteForModel("openai/gpt-4o", anthropicAndOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.modelId).toBe("openai/gpt-4o");
    });

    it("uses OpenRouter for non-direct providers", () => {
      const route = getRouteForModel("meta-llama/llama-3.1-70b", anthropicAndOpenRouter);
      expect(route?.source).toBe("openrouter");
    });
  });

  describe("with all direct keys (no OpenRouter)", () => {
    it("routes each provider to its direct key", () => {
      expect(getRouteForModel("anthropic/claude-3.7-sonnet", allDirect)?.source).toBe("direct");
      expect(getRouteForModel("openai/gpt-4o", allDirect)?.source).toBe("direct");
      expect(getRouteForModel("google/gemini-2.5-flash", allDirect)?.source).toBe("direct");
    });

    it("returns null for non-direct providers (no OpenRouter fallback)", () => {
      expect(getRouteForModel("meta-llama/llama-3.1-70b", allDirect)).toBeNull();
    });
  });

  describe("with all keys", () => {
    it("still prefers direct keys over OpenRouter", () => {
      expect(getRouteForModel("anthropic/claude-3.7-sonnet", allKeys)?.source).toBe("direct");
      expect(getRouteForModel("openai/gpt-4o", allKeys)?.source).toBe("direct");
    });

    it("uses OpenRouter for non-direct providers", () => {
      expect(getRouteForModel("meta-llama/llama-3.1-70b", allKeys)?.source).toBe("openrouter");
    });
  });

  describe("edge cases", () => {
    it("handles direct format model IDs (no slash)", () => {
      // If someone passes "gpt-4o" instead of "openai/gpt-4o"
      const route = getRouteForModel("gpt-4o", onlyOpenRouter);
      expect(route).not.toBeNull();
      // Should infer provider and route through OpenRouter
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("openai");
    });

    it("handles direct format with matching direct key", () => {
      const route = getRouteForModel("claude-3.7-sonnet", onlyAnthropic);
      expect(route?.source).toBe("direct");
      expect(route?.provider).toBe("anthropic");
      expect(route?.modelId).toBe("claude-3.7-sonnet");
    });

    it("handles models with :free suffix", () => {
      const route = getRouteForModel("mistralai/devstral-2512:free", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("mistralai");
      expect(route?.modelId).toBe("mistralai/devstral-2512:free");
    });
  });

  describe("non-direct providers (always OpenRouter)", () => {
    it("routes meta-llama through OpenRouter", () => {
      const route = getRouteForModel("meta-llama/llama-4-scout", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("meta-llama");
    });

    it("routes mistralai through OpenRouter", () => {
      const route = getRouteForModel("mistralai/mistral-large-2512", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("mistralai");
    });

    it("routes deepseek through OpenRouter", () => {
      const route = getRouteForModel("deepseek/deepseek-v3.2", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("deepseek");
    });

    it("routes qwen through OpenRouter", () => {
      const route = getRouteForModel("qwen/qwen3-vl-32b-instruct", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("qwen");
    });

    it("routes x-ai (Grok) through OpenRouter", () => {
      const route = getRouteForModel("x-ai/grok-4.1-fast", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("x-ai");
    });

    it("routes z-ai (GLM) through OpenRouter", () => {
      const route = getRouteForModel("z-ai/glm-4.7", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("z-ai");
    });

    it("routes cohere through OpenRouter", () => {
      const route = getRouteForModel("cohere/command-r-plus", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("cohere");
    });

    it("routes perplexity through OpenRouter", () => {
      const route = getRouteForModel("perplexity/sonar-pro-search", onlyOpenRouter);
      expect(route?.source).toBe("openrouter");
      expect(route?.provider).toBe("perplexity");
    });

    it("returns null for non-direct providers when no OpenRouter key", () => {
      expect(getRouteForModel("meta-llama/llama-4-scout", allDirect)).toBeNull();
      expect(getRouteForModel("mistralai/mistral-large", allDirect)).toBeNull();
      expect(getRouteForModel("deepseek/deepseek-chat", allDirect)).toBeNull();
      expect(getRouteForModel("qwen/qwen3-vl-32b", allDirect)).toBeNull();
      expect(getRouteForModel("x-ai/grok-2", allDirect)).toBeNull();
    });
  });
});

describe("canAccessModel", () => {
  const onlyOpenRouter: KeySet = { anthropic: null, openai: null, google: null, openrouter: "or-key" };
  const onlyAnthropic: KeySet = { anthropic: "ant-key", openai: null, google: null, openrouter: null };

  it("returns true when route exists", () => {
    expect(canAccessModel("openai/gpt-4o", onlyOpenRouter)).toBe(true);
    expect(canAccessModel("anthropic/claude-3.7-sonnet", onlyAnthropic)).toBe(true);
  });

  it("returns false when no route exists", () => {
    expect(canAccessModel("openai/gpt-4o", onlyAnthropic)).toBe(false);
  });
});
