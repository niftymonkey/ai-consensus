import { describe, it, expect } from "vitest";
import {
  isTextFocused,
  scoreModelForPurpose,
  selectModelsForPreset,
  extractVersion,
  type Purpose,
} from "../presets";
import type { OpenRouterModelWithMeta } from "../openrouter-models";

// Helper to create a minimal model for testing (reuses pattern from openrouter-models.test.ts)
function createMockModel(
  overrides: Partial<OpenRouterModelWithMeta> & {
    output_modalities?: string[];
    input_modalities?: string[];
  }
): OpenRouterModelWithMeta {
  return {
    id: overrides.id || "test/test-model",
    name: overrides.name || "Test Model",
    description: "",
    context_length: overrides.context_length || 128000,
    pricing: { prompt: "0.001", completion: "0.002" },
    architecture: {
      modality: "text",
      input_modalities: overrides.input_modalities || ["text"],
      output_modalities: overrides.output_modalities || ["text"],
    },
    top_provider: {
      context_length: overrides.context_length || 128000,
      max_completion_tokens: null,
      is_moderated: false,
    },
    supported_parameters: overrides.supportsTools ? ["tools"] : [],
    provider: overrides.provider || "test",
    shortName: overrides.shortName || "Test Model",
    costPerMillionInput: overrides.costPerMillionInput ?? 1,
    costPerMillionOutput: overrides.costPerMillionOutput ?? 2,
    isFree: false,
    supportsTools: overrides.supportsTools ?? true,
    isTextOnly: true,
  };
}

// Representative models based on REAL OpenRouter API data (Jan 2025)
// Verified against: curl https://openrouter.ai/api/v1/models
const MOCK_MODELS = {
  // ============================================
  // FLAGSHIP TIER
  // ============================================
  // Claude 4.x uses type-version format: claude-opus-4.5
  claudeOpus45: createMockModel({
    id: "anthropic/claude-opus-4.5",
    shortName: "Claude Opus 4.5",
    provider: "anthropic",
    costPerMillionInput: 15,
    costPerMillionOutput: 75,
  }),
  gpt52Pro: createMockModel({
    id: "openai/gpt-5.2-pro",
    shortName: "GPT-5.2 Pro",
    provider: "openai",
    costPerMillionInput: 20,
    costPerMillionOutput: 60,
  }),
  gemini3Pro: createMockModel({
    id: "google/gemini-3-pro-preview",
    shortName: "Gemini 3 Pro Preview",
    provider: "google",
    costPerMillionInput: 12,
    costPerMillionOutput: 36,
  }),
  o1Pro: createMockModel({
    id: "openai/o1-pro",
    shortName: "O1 Pro",
    provider: "openai",
    costPerMillionInput: 30,
    costPerMillionOutput: 120,
  }),

  // ============================================
  // STANDARD TIER
  // ============================================
  // Claude 4.x: type-version format
  claudeSonnet45: createMockModel({
    id: "anthropic/claude-sonnet-4.5",
    shortName: "Claude Sonnet 4.5",
    provider: "anthropic",
    costPerMillionInput: 3,
    costPerMillionOutput: 15,
  }),
  claudeSonnet4: createMockModel({
    id: "anthropic/claude-sonnet-4",
    shortName: "Claude Sonnet 4",
    provider: "anthropic",
    costPerMillionInput: 3,
    costPerMillionOutput: 15,
  }),
  // Claude 3.x: version-type format (older naming convention)
  claude37Sonnet: createMockModel({
    id: "anthropic/claude-3.7-sonnet",
    shortName: "Claude 3.7 Sonnet",
    provider: "anthropic",
    costPerMillionInput: 3,
    costPerMillionOutput: 15,
  }),
  claude35Sonnet: createMockModel({
    id: "anthropic/claude-3.5-sonnet",
    shortName: "Claude 3.5 Sonnet",
    provider: "anthropic",
    costPerMillionInput: 3,
    costPerMillionOutput: 15,
  }),
  gpt52: createMockModel({
    id: "openai/gpt-5.2",
    shortName: "GPT-5.2",
    provider: "openai",
    costPerMillionInput: 5,
    costPerMillionOutput: 15,
  }),
  gpt51: createMockModel({
    id: "openai/gpt-5.1",
    shortName: "GPT-5.1",
    provider: "openai",
    costPerMillionInput: 5,
    costPerMillionOutput: 15,
  }),
  gpt5: createMockModel({
    id: "openai/gpt-5",
    shortName: "GPT-5",
    provider: "openai",
    costPerMillionInput: 5,
    costPerMillionOutput: 15,
  }),
  gpt4o: createMockModel({
    id: "openai/gpt-4o",
    shortName: "GPT-4o",
    provider: "openai",
    input_modalities: ["text", "image"],
    output_modalities: ["text"],
    costPerMillionInput: 2.5,
    costPerMillionOutput: 10,
  }),
  gemini25Pro: createMockModel({
    id: "google/gemini-2.5-pro",
    shortName: "Gemini 2.5 Pro",
    provider: "google",
    costPerMillionInput: 2.5,
    costPerMillionOutput: 10,
  }),

  // ============================================
  // EFFICIENT TIER
  // ============================================
  // Claude 4.x haiku
  claudeHaiku45: createMockModel({
    id: "anthropic/claude-haiku-4.5",
    shortName: "Claude Haiku 4.5",
    provider: "anthropic",
    costPerMillionInput: 0.25,
    costPerMillionOutput: 1.25,
  }),
  // Claude 3.x haiku (older naming)
  claude35Haiku: createMockModel({
    id: "anthropic/claude-3.5-haiku",
    shortName: "Claude 3.5 Haiku",
    provider: "anthropic",
    costPerMillionInput: 0.25,
    costPerMillionOutput: 1.25,
  }),
  gpt5Mini: createMockModel({
    id: "openai/gpt-5-mini",
    shortName: "GPT-5 Mini",
    provider: "openai",
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6,
  }),
  gpt5Nano: createMockModel({
    id: "openai/gpt-5-nano",
    shortName: "GPT-5 Nano",
    provider: "openai",
    costPerMillionInput: 0.075,
    costPerMillionOutput: 0.3,
  }),
  gpt4oMini: createMockModel({
    id: "openai/gpt-4o-mini",
    shortName: "GPT-4o Mini",
    provider: "openai",
    costPerMillionInput: 0.15,
    costPerMillionOutput: 0.6,
  }),
  gemini25Flash: createMockModel({
    id: "google/gemini-2.5-flash",
    shortName: "Gemini 2.5 Flash",
    provider: "google",
    costPerMillionInput: 0.1,
    costPerMillionOutput: 0.4,
  }),
  // ============================================
  // NON-TEXT OUTPUT MODELS (should be excluded)
  // ============================================
  gpt5Image: createMockModel({
    id: "openai/gpt-5-image",
    shortName: "GPT-5 Image",
    provider: "openai",
    output_modalities: ["text", "image"],
  }),
  geminiFlashImage: createMockModel({
    id: "google/gemini-2.5-flash-image",
    shortName: "Gemini 2.5 Flash Image",
    provider: "google",
    output_modalities: ["text", "image"],
  }),
  audioModel: createMockModel({
    id: "test/audio-model",
    shortName: "Audio Model",
    provider: "test",
    output_modalities: ["text", "audio"],
  }),
};

describe("isTextFocused", () => {
  it("returns true for text-only output models", () => {
    expect(isTextFocused(MOCK_MODELS.gpt52)).toBe(true);
    expect(isTextFocused(MOCK_MODELS.claudeSonnet45)).toBe(true);
    expect(isTextFocused(MOCK_MODELS.claude37Sonnet)).toBe(true);
    expect(isTextFocused(MOCK_MODELS.gemini25Pro)).toBe(true);
  });

  it("returns true for models that accept image input but output text only", () => {
    expect(isTextFocused(MOCK_MODELS.gpt4o)).toBe(true);
  });

  it("returns false for image output models", () => {
    expect(isTextFocused(MOCK_MODELS.gpt5Image)).toBe(false);
    expect(isTextFocused(MOCK_MODELS.geminiFlashImage)).toBe(false);
  });

  it("returns false for audio output models", () => {
    expect(isTextFocused(MOCK_MODELS.audioModel)).toBe(false);
  });
});

describe("extractVersion", () => {
  describe("Claude 4.x naming (type-version): claude-sonnet-4.5", () => {
    it("extracts version from type-version format", () => {
      expect(extractVersion("anthropic/claude-sonnet-4.5")).toBe(450);
      expect(extractVersion("anthropic/claude-opus-4.5")).toBe(450);
      expect(extractVersion("anthropic/claude-haiku-4.5")).toBe(450);
      expect(extractVersion("anthropic/claude-sonnet-4")).toBe(400);
    });
  });

  describe("Claude 3.x naming (version-type): claude-3.7-sonnet", () => {
    it("extracts version from version-type format", () => {
      expect(extractVersion("anthropic/claude-3.7-sonnet")).toBe(370);
      expect(extractVersion("anthropic/claude-3.5-sonnet")).toBe(350);
      expect(extractVersion("anthropic/claude-3.5-haiku")).toBe(350);
      expect(extractVersion("anthropic/claude-3-haiku")).toBe(300);
    });
  });

  describe("OpenAI naming: gpt-5.2, gpt-4o", () => {
    it("extracts version from gpt models", () => {
      expect(extractVersion("openai/gpt-5.2")).toBe(520);
      expect(extractVersion("openai/gpt-5.1")).toBe(510);
      expect(extractVersion("openai/gpt-5")).toBe(500);
      expect(extractVersion("openai/gpt-4o")).toBe(400);
      expect(extractVersion("openai/gpt-4o-mini")).toBe(400);
    });
  });

  describe("Google naming: gemini-2.5-pro", () => {
    it("extracts version from gemini models", () => {
      expect(extractVersion("google/gemini-2.5-pro")).toBe(250);
      expect(extractVersion("google/gemini-2.5-flash")).toBe(250);
      expect(extractVersion("google/gemini-3-pro-preview")).toBe(300);
    });
  });

  it("returns 0 for models without version numbers", () => {
    expect(extractVersion("test/some-model")).toBe(0);
    expect(extractVersion("openai/o1-pro")).toBe(100); // o1 has version 1
  });

  // Edge cases discovered from real OpenRouter catalog testing
  describe("edge cases from real catalog", () => {
    describe("date codes (should NOT match)", () => {
      it("ignores date codes like 2512, 0728", () => {
        expect(extractVersion("mistralai/devstral-2512")).toBe(0);
        expect(extractVersion("meta-llama/llama-0728-instruct")).toBe(0);
      });
    });

    describe("model size patterns", () => {
      it("ignores NxMB patterns like 8x22b, 8x7b", () => {
        expect(extractVersion("mistralai/mixtral-8x22b-instruct")).toBe(0);
        expect(extractVersion("mistralai/mixtral-8x7b")).toBe(0);
      });

      it("ignores plain size patterns like 70b, 8b", () => {
        expect(extractVersion("meta-llama/llama-70b")).toBe(0);
        expect(extractVersion("qwen/qwen-8b")).toBe(0);
      });

      it("extracts version but ignores trailing size", () => {
        expect(extractVersion("meta-llama/llama-3.1-70b-instruct")).toBe(310);
        expect(extractVersion("meta-llama/llama-3.2-8b")).toBe(320);
      });

      it("ignores decimal sizes like 3.5b (model sizes, not versions)", () => {
        expect(extractVersion("microsoft/phi-3.5b-mini")).toBe(0);
      });
    });

    describe("real-world edge cases", () => {
      it("handles models with no version", () => {
        expect(extractVersion("deepseek/deepseek-coder")).toBe(0);
        expect(extractVersion("mistralai/mistral-large")).toBe(0);
      });

      it("handles reasoning models (o1, o3, o4)", () => {
        expect(extractVersion("openai/o1-preview")).toBe(100);
        expect(extractVersion("openai/o3-mini")).toBe(300);
        expect(extractVersion("openai/o4")).toBe(400);
      });
    });
  });
});

describe("scoreModelForPurpose", () => {
  describe("casual purpose", () => {
    const purpose: Purpose = "casual";

    it("scores haiku-4.5 highest", () => {
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claudeHaiku45, purpose);
      const sonnetScore = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      expect(haikuScore).toBeGreaterThan(sonnetScore);
      expect(haikuScore).toBeGreaterThan(opusScore);
    });

    it("scores gpt-5-mini/nano highest", () => {
      const miniScore = scoreModelForPurpose(MOCK_MODELS.gpt5Mini, purpose);
      const nanoScore = scoreModelForPurpose(MOCK_MODELS.gpt5Nano, purpose);
      const standardScore = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      expect(miniScore).toBeGreaterThan(standardScore);
      expect(nanoScore).toBeGreaterThan(standardScore);
    });

    it("scores gemini flash models highest", () => {
      const flashScore = scoreModelForPurpose(MOCK_MODELS.gemini25Flash, purpose);
      const proScore = scoreModelForPurpose(MOCK_MODELS.gemini25Pro, purpose);
      expect(flashScore).toBeGreaterThan(proScore);
    });

    it("scores flagship models lower (overkill)", () => {
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claudeHaiku45, purpose);
      expect(opusScore).toBeLessThan(haikuScore);
    });
  });

  describe("balanced purpose", () => {
    const purpose: Purpose = "balanced";

    it("scores claude-sonnet-4.5 highest", () => {
      const sonnetScore = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claudeHaiku45, purpose);
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      expect(sonnetScore).toBeGreaterThan(haikuScore);
      // Standard tier should score at least as high as flagship
      expect(sonnetScore).toBeGreaterThanOrEqual(opusScore);
    });

    it("scores gpt-5.2 highest", () => {
      const gpt52Score = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      const miniScore = scoreModelForPurpose(MOCK_MODELS.gpt5Mini, purpose);
      expect(gpt52Score).toBeGreaterThan(miniScore);
    });

    it("scores gemini-2.5-pro highest", () => {
      const proScore = scoreModelForPurpose(MOCK_MODELS.gemini25Pro, purpose);
      const flashScore = scoreModelForPurpose(MOCK_MODELS.gemini25Flash, purpose);
      expect(proScore).toBeGreaterThan(flashScore);
    });

    it("scores mini models lower", () => {
      const miniScore = scoreModelForPurpose(MOCK_MODELS.gpt5Mini, purpose);
      const standardScore = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      expect(miniScore).toBeLessThan(standardScore);
    });
  });

  describe("research purpose", () => {
    const purpose: Purpose = "research";

    it("scores claude-opus-4.5 highest", () => {
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      const sonnetScore = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claudeHaiku45, purpose);
      expect(opusScore).toBeGreaterThan(sonnetScore);
      expect(opusScore).toBeGreaterThan(haikuScore);
    });

    it("scores gpt-5.2-pro highest", () => {
      const proScore = scoreModelForPurpose(MOCK_MODELS.gpt52Pro, purpose);
      const standardScore = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      expect(proScore).toBeGreaterThan(standardScore);
    });

    it("scores gemini-3-pro highest", () => {
      const gemini3Score = scoreModelForPurpose(MOCK_MODELS.gemini3Pro, purpose);
      const gemini25Score = scoreModelForPurpose(MOCK_MODELS.gemini25Pro, purpose);
      expect(gemini3Score).toBeGreaterThan(gemini25Score);
    });

    it("scores efficient models low", () => {
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claudeHaiku45, purpose);
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      expect(haikuScore).toBeLessThan(opusScore);
    });
  });

  describe("coding purpose", () => {
    const purpose: Purpose = "coding";

    it("scores standard tier with tool support highest", () => {
      const sonnetScore = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claudeHaiku45, purpose);
      expect(sonnetScore).toBeGreaterThan(haikuScore);
    });

    it("scores claude-sonnet-4.5, gpt-5.2 high", () => {
      const sonnetScore = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      const gpt52Score = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      const miniScore = scoreModelForPurpose(MOCK_MODELS.gpt5Mini, purpose);
      expect(sonnetScore).toBeGreaterThan(miniScore);
      expect(gpt52Score).toBeGreaterThan(miniScore);
    });
  });

  describe("creative purpose", () => {
    const purpose: Purpose = "creative";

    it("scores anthropic flagship highest (opus)", () => {
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      const sonnetScore = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      expect(opusScore).toBeGreaterThan(sonnetScore);
    });

    it("scores openai flagship second (gpt-5.2-pro)", () => {
      const gptProScore = scoreModelForPurpose(MOCK_MODELS.gpt52Pro, purpose);
      const gptStandardScore = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      expect(gptProScore).toBeGreaterThan(gptStandardScore);
    });

    it("scores mini models lower", () => {
      const miniScore = scoreModelForPurpose(MOCK_MODELS.gpt5Mini, purpose);
      const opusScore = scoreModelForPurpose(MOCK_MODELS.claudeOpus45, purpose);
      expect(miniScore).toBeLessThan(opusScore);
    });
  });

  describe("version tiebreaker", () => {
    it("gpt-5.2 beats gpt-5.1 when purpose scores equal", () => {
      const purpose: Purpose = "balanced";
      const gpt52Score = scoreModelForPurpose(MOCK_MODELS.gpt52, purpose);
      const gpt51Score = scoreModelForPurpose(MOCK_MODELS.gpt51, purpose);
      expect(gpt52Score).toBeGreaterThan(gpt51Score);
    });

    it("claude-sonnet-4.5 beats claude-sonnet-4 when purpose scores equal", () => {
      const purpose: Purpose = "balanced";
      const sonnet45Score = scoreModelForPurpose(MOCK_MODELS.claudeSonnet45, purpose);
      const sonnet4Score = scoreModelForPurpose(MOCK_MODELS.claudeSonnet4, purpose);
      expect(sonnet45Score).toBeGreaterThan(sonnet4Score);
    });

    it("gemini-3-pro beats gemini-2.5-pro when purpose scores equal", () => {
      const purpose: Purpose = "research";
      const gemini3Score = scoreModelForPurpose(MOCK_MODELS.gemini3Pro, purpose);
      const gemini25Score = scoreModelForPurpose(MOCK_MODELS.gemini25Pro, purpose);
      // Both are flagship, but gemini-3 should win via version tiebreaker
      expect(gemini3Score).toBeGreaterThan(gemini25Score);
    });
  });

  describe("Claude 3.x naming convention (version-type format)", () => {
    it("claude-3.7-sonnet is detected as standard tier", () => {
      const purpose: Purpose = "balanced";
      const sonnet37Score = scoreModelForPurpose(MOCK_MODELS.claude37Sonnet, purpose);
      const haikuScore = scoreModelForPurpose(MOCK_MODELS.claude35Haiku, purpose);
      // Standard tier should score higher than efficient tier for balanced purpose
      expect(sonnet37Score).toBeGreaterThan(haikuScore);
    });

    it("claude-3.5-haiku is detected as efficient tier", () => {
      const purpose: Purpose = "casual";
      const haiku35Score = scoreModelForPurpose(MOCK_MODELS.claude35Haiku, purpose);
      const sonnet37Score = scoreModelForPurpose(MOCK_MODELS.claude37Sonnet, purpose);
      // Efficient tier should score higher for casual purpose
      expect(haiku35Score).toBeGreaterThan(sonnet37Score);
    });

    it("newer claude-3.7-sonnet beats older claude-3.5-sonnet via version", () => {
      const purpose: Purpose = "balanced";
      const sonnet37Score = scoreModelForPurpose(MOCK_MODELS.claude37Sonnet, purpose);
      const sonnet35Score = scoreModelForPurpose(MOCK_MODELS.claude35Sonnet, purpose);
      expect(sonnet37Score).toBeGreaterThan(sonnet35Score);
    });
  });
});

describe("selectModelsForPreset", () => {
  const allModels = Object.values(MOCK_MODELS);
  // Filter to text-focused models for selection tests
  const textModels = allModels.filter(
    (m) => !m.architecture.output_modalities?.some((o) => ["image", "audio", "video"].includes(o))
  );

  it("returns correct number of models for preset", () => {
    const result2 = selectModelsForPreset("casual", textModels, 2);
    const result3 = selectModelsForPreset("balanced", textModels, 3);
    expect(result2).toHaveLength(2);
    expect(result3).toHaveLength(3);
  });

  it("maximizes provider diversity when possible", () => {
    const result = selectModelsForPreset("balanced", textModels, 3);
    const providers = result.map((m) => m.provider);
    const uniqueProviders = new Set(providers);
    // Should have 3 different providers when available
    expect(uniqueProviders.size).toBe(3);
  });

  it("falls back to same provider when only one available", () => {
    const singleProviderModels = [
      MOCK_MODELS.claudeSonnet45,
      MOCK_MODELS.claudeHaiku45,
      MOCK_MODELS.claudeOpus45,
    ];
    const result = selectModelsForPreset("balanced", singleProviderModels, 2);
    expect(result).toHaveLength(2);
    expect(result.every((m) => m.provider === "anthropic")).toBe(true);
  });

  it("handles case where fewer models available than requested", () => {
    const fewModels = [MOCK_MODELS.claudeSonnet45, MOCK_MODELS.gpt52];
    const result = selectModelsForPreset("balanced", fewModels, 3);
    expect(result).toHaveLength(2);
  });

  it("returns at least 2 models or throws error", () => {
    const singleModel = [MOCK_MODELS.claudeSonnet45];
    expect(() => selectModelsForPreset("balanced", singleModel, 2)).toThrow();
  });

  it("excludes image/audio/video output models from selection", () => {
    const modelsWithImage = [
      MOCK_MODELS.gpt5Image,
      MOCK_MODELS.geminiFlashImage,
      MOCK_MODELS.claudeSonnet45,
      MOCK_MODELS.gpt52,
    ];
    const result = selectModelsForPreset("balanced", modelsWithImage, 2);
    expect(result.some((m) => m.id === "openai/gpt-5-image")).toBe(false);
    expect(result.some((m) => m.id === "google/gemini-2.5-flash-image")).toBe(false);
  });

  it("prefers newer versions when scores are otherwise equal", () => {
    const versionedModels = [
      MOCK_MODELS.gpt52,
      MOCK_MODELS.gpt51,
      MOCK_MODELS.gpt5,
      MOCK_MODELS.claudeSonnet45,
    ];
    const result = selectModelsForPreset("balanced", versionedModels, 2);
    // Should pick gpt-5.2 over gpt-5.1 or gpt-5
    const openaiModel = result.find((m) => m.provider === "openai");
    expect(openaiModel?.id).toBe("openai/gpt-5.2");
  });

  it("selects efficient models for casual purpose", () => {
    const result = selectModelsForPreset("casual", textModels, 2);
    // Should prefer mini/nano/flash/haiku models
    const ids = result.map((m) => m.id);
    const hasEfficient = ids.some(
      (id) =>
        id.includes("mini") ||
        id.includes("nano") ||
        id.includes("flash") ||
        id.includes("haiku")
    );
    expect(hasEfficient).toBe(true);
  });

  it("selects flagship models for research purpose", () => {
    const result = selectModelsForPreset("research", textModels, 2);
    // Should prefer opus/pro models
    const ids = result.map((m) => m.id);
    const hasFlagship = ids.some(
      (id) => id.includes("opus") || id.includes("-pro") || id.includes("o1-pro")
    );
    expect(hasFlagship).toBe(true);
  });
});
