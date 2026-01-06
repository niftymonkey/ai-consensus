import { describe, it, expect } from "vitest";
import {
  isEvaluationSuitable,
  getRecommendedEvaluatorModels,
  type OpenRouterModelWithMeta,
} from "../openrouter-models";

// Helper to create a minimal model for testing
function createMockModel(
  overrides: Partial<OpenRouterModelWithMeta>
): OpenRouterModelWithMeta {
  return {
    id: overrides.id || "test/test-model",
    name: overrides.name || "Test Model",
    description: "",
    context_length: overrides.context_length || 32000,
    pricing: { prompt: "0.001", completion: "0.002" },
    architecture: {
      modality: "text",
      input_modalities: ["text"],
      output_modalities: ["text"],
    },
    top_provider: {
      context_length: overrides.context_length || 32000,
      max_completion_tokens: null,
      is_moderated: false,
    },
    supported_parameters: overrides.supportsTools ? ["tools"] : [],
    provider: overrides.provider || "test",
    shortName: overrides.shortName || "Test Model",
    costPerMillionInput: 1,
    costPerMillionOutput: 2,
    isFree: false,
    supportsTools: overrides.supportsTools ?? true,
    isTextOnly: true,
  };
}

describe("isEvaluationSuitable", () => {
  describe("negative filters - lightweight models", () => {
    it("excludes haiku models", () => {
      const model = createMockModel({
        id: "anthropic/claude-3.5-haiku",
        shortName: "Claude 3.5 Haiku",
        provider: "anthropic",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes mini models", () => {
      const model = createMockModel({
        id: "openai/gpt-4o-mini",
        shortName: "GPT-4o Mini",
        provider: "openai",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes flash models", () => {
      const model = createMockModel({
        id: "google/gemini-2.0-flash",
        shortName: "Gemini 2.0 Flash",
        provider: "google",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes nano models", () => {
      const model = createMockModel({
        id: "test/nano-model",
        shortName: "Nano Model",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes lite models", () => {
      const model = createMockModel({
        id: "test/model-lite",
        shortName: "Model Lite",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes tiny models", () => {
      const model = createMockModel({
        id: "test/tiny-model",
        shortName: "Tiny Model",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes small models", () => {
      const model = createMockModel({
        id: "mistral/mistral-small",
        shortName: "Mistral Small",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });
  });

  describe("negative filters - code-specialized models", () => {
    it("excludes models with 'code' in name", () => {
      const model = createMockModel({
        id: "deepseek/deepseek-code",
        shortName: "DeepSeek Code",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes models with 'coder' in name", () => {
      const model = createMockModel({
        id: "deepseek/deepseek-coder",
        shortName: "DeepSeek Coder",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes codex models", () => {
      const model = createMockModel({
        id: "openai/codex",
        shortName: "Codex",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });
  });

  describe("negative filters - vision-specialized models", () => {
    it("excludes models with 'vision' in name", () => {
      const model = createMockModel({
        id: "openai/gpt-4-vision",
        shortName: "GPT-4 Vision",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes models with '-vl' suffix in id", () => {
      const model = createMockModel({
        id: "qwen/qwen-2-vl",
        shortName: "Qwen 2",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("excludes models with 'omni' in name", () => {
      const model = createMockModel({
        id: "openai/gpt-4o-omni",
        shortName: "GPT-4o Omni",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });
  });

  describe("negative filters - base models", () => {
    it("excludes models with 'base' in name", () => {
      const model = createMockModel({
        id: "meta-llama/llama-3.1-70b-base",
        shortName: "Llama 3.1 70B Base",
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });
  });

  describe("negative filters - small context", () => {
    it("excludes models with context < 8000", () => {
      const model = createMockModel({
        id: "test/small-context",
        shortName: "Small Context Model",
        context_length: 4096,
      });
      expect(isEvaluationSuitable(model)).toBe(false);
    });

    it("allows models with context >= 8000", () => {
      const model = createMockModel({
        id: "test/medium-context",
        shortName: "Medium Context Model",
        context_length: 8000,
      });
      expect(isEvaluationSuitable(model)).toBe(true);
    });
  });

  describe("allows capable models", () => {
    it("allows Claude Sonnet", () => {
      const model = createMockModel({
        id: "anthropic/claude-3.5-sonnet",
        shortName: "Claude 3.5 Sonnet",
        provider: "anthropic",
      });
      expect(isEvaluationSuitable(model)).toBe(true);
    });

    it("allows Claude Opus", () => {
      const model = createMockModel({
        id: "anthropic/claude-3-opus",
        shortName: "Claude 3 Opus",
        provider: "anthropic",
      });
      expect(isEvaluationSuitable(model)).toBe(true);
    });

    it("allows GPT-4o", () => {
      const model = createMockModel({
        id: "openai/gpt-4o",
        shortName: "GPT-4o",
        provider: "openai",
      });
      expect(isEvaluationSuitable(model)).toBe(true);
    });

    it("allows Gemini Pro", () => {
      const model = createMockModel({
        id: "google/gemini-1.5-pro",
        shortName: "Gemini 1.5 Pro",
        provider: "google",
      });
      expect(isEvaluationSuitable(model)).toBe(true);
    });

    it("allows DeepSeek V3 (not code-specialized)", () => {
      const model = createMockModel({
        id: "deepseek/deepseek-v3",
        shortName: "DeepSeek V3",
        provider: "deepseek",
      });
      expect(isEvaluationSuitable(model)).toBe(true);
    });
  });
});

describe("getRecommendedEvaluatorModels", () => {
  it("returns up to 3 models by default", () => {
    const models = [
      createMockModel({ id: "anthropic/claude-3.5-sonnet", shortName: "Claude 3.5 Sonnet", provider: "anthropic" }),
      createMockModel({ id: "openai/gpt-4o", shortName: "GPT-4o", provider: "openai" }),
      createMockModel({ id: "google/gemini-1.5-pro", shortName: "Gemini 1.5 Pro", provider: "google" }),
      createMockModel({ id: "meta-llama/llama-3.1-70b", shortName: "Llama 3.1 70B", provider: "meta-llama" }),
    ];

    const result = getRecommendedEvaluatorModels(models);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it("respects maxModels parameter", () => {
    const models = [
      createMockModel({ id: "anthropic/claude-3.5-sonnet", shortName: "Claude 3.5 Sonnet", provider: "anthropic" }),
      createMockModel({ id: "openai/gpt-4o", shortName: "GPT-4o", provider: "openai" }),
      createMockModel({ id: "google/gemini-1.5-pro", shortName: "Gemini 1.5 Pro", provider: "google" }),
    ];

    const result = getRecommendedEvaluatorModels(models, 2);
    expect(result.length).toBe(2);
  });

  it("ensures provider diversity - max one per provider", () => {
    const models = [
      createMockModel({ id: "anthropic/claude-3.5-sonnet", shortName: "Claude 3.5 Sonnet", provider: "anthropic" }),
      createMockModel({ id: "anthropic/claude-3-opus", shortName: "Claude 3 Opus", provider: "anthropic" }),
      createMockModel({ id: "openai/gpt-4o", shortName: "GPT-4o", provider: "openai" }),
      createMockModel({ id: "google/gemini-1.5-pro", shortName: "Gemini 1.5 Pro", provider: "google" }),
    ];

    const result = getRecommendedEvaluatorModels(models, 3);
    const providers = result.map(id => id.split("/")[0]);
    const uniqueProviders = new Set(providers);

    expect(uniqueProviders.size).toBe(result.length);
  });

  it("prioritizes anthropic, openai, google", () => {
    const models = [
      createMockModel({ id: "meta-llama/llama-3.1-70b", shortName: "Llama 3.1 70B", provider: "meta-llama" }),
      createMockModel({ id: "anthropic/claude-3.5-sonnet", shortName: "Claude 3.5 Sonnet", provider: "anthropic" }),
      createMockModel({ id: "mistral/mistral-large", shortName: "Mistral Large", provider: "mistral" }),
    ];

    const result = getRecommendedEvaluatorModels(models, 1);
    expect(result[0]).toBe("anthropic/claude-3.5-sonnet");
  });

  it("never includes excluded model types", () => {
    const models = [
      createMockModel({ id: "anthropic/claude-3.5-haiku", shortName: "Claude 3.5 Haiku", provider: "anthropic" }),
      createMockModel({ id: "openai/gpt-4o-mini", shortName: "GPT-4o Mini", provider: "openai" }),
      createMockModel({ id: "google/gemini-2.0-flash", shortName: "Gemini 2.0 Flash", provider: "google" }),
      createMockModel({ id: "anthropic/claude-3.5-sonnet", shortName: "Claude 3.5 Sonnet", provider: "anthropic" }),
    ];

    const result = getRecommendedEvaluatorModels(models);

    expect(result).not.toContain("anthropic/claude-3.5-haiku");
    expect(result).not.toContain("openai/gpt-4o-mini");
    expect(result).not.toContain("google/gemini-2.0-flash");
    expect(result).toContain("anthropic/claude-3.5-sonnet");
  });

  it("returns empty array when no suitable models", () => {
    const models = [
      createMockModel({ id: "anthropic/claude-3.5-haiku", shortName: "Claude 3.5 Haiku", provider: "anthropic" }),
      createMockModel({ id: "openai/gpt-4o-mini", shortName: "GPT-4o Mini", provider: "openai" }),
    ];

    const result = getRecommendedEvaluatorModels(models);
    expect(result).toHaveLength(0);
  });

  it("prefers models with tool support", () => {
    const models = [
      createMockModel({
        id: "test/no-tools",
        shortName: "No Tools Model",
        provider: "test",
        supportsTools: false
      }),
      createMockModel({
        id: "test/with-tools",
        shortName: "With Tools Model",
        provider: "test",
        supportsTools: true
      }),
    ];

    const result = getRecommendedEvaluatorModels(models, 1);
    expect(result[0]).toBe("test/with-tools");
  });

  it("prefers models with larger context", () => {
    const models = [
      createMockModel({
        id: "test/small-ctx",
        shortName: "Small Context",
        provider: "test",
        context_length: 16000
      }),
      createMockModel({
        id: "test/large-ctx",
        shortName: "Large Context",
        provider: "test2",
        context_length: 128000
      }),
    ];

    const result = getRecommendedEvaluatorModels(models, 1);
    expect(result[0]).toBe("test/large-ctx");
  });
});
