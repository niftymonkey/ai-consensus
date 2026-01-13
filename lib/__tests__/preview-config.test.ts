import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Preview Configuration", () => {
  describe("getPreviewApiKey", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns API key when configured", async () => {
      vi.stubEnv("OPENROUTER_PREVIEW_API_KEY", "sk-or-test-key");
      const { getPreviewApiKey } = await import("../config/preview");
      expect(getPreviewApiKey()).toBe("sk-or-test-key");
    });

    it("throws error when not configured", async () => {
      vi.stubEnv("OPENROUTER_PREVIEW_API_KEY", "");
      vi.unstubAllEnvs();
      const { getPreviewApiKey } = await import("../config/preview");
      expect(() => getPreviewApiKey()).toThrow(
        "OPENROUTER_PREVIEW_API_KEY is not configured"
      );
    });
  });

  describe("isPreviewEnabled", () => {
    beforeEach(() => {
      vi.resetModules();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("returns true when API key is configured", async () => {
      vi.stubEnv("OPENROUTER_PREVIEW_API_KEY", "sk-or-test-key");
      const { isPreviewEnabled } = await import("../config/preview");
      expect(isPreviewEnabled()).toBe(true);
    });

    it("returns false when API key is not configured", async () => {
      // Don't stub to ensure env var is not set
      const { isPreviewEnabled } = await import("../config/preview");
      expect(isPreviewEnabled()).toBe(false);
    });
  });

  describe("isModelAllowedInPreview", () => {
    it("returns true for allowed models", async () => {
      const { isModelAllowedInPreview } = await import("../config/preview");
      expect(isModelAllowedInPreview("openai/gpt-4o-mini")).toBe(true);
      expect(isModelAllowedInPreview("anthropic/claude-3.5-haiku")).toBe(true);
    });

    it("returns false for disallowed models", async () => {
      const { isModelAllowedInPreview } = await import("../config/preview");
      expect(isModelAllowedInPreview("openai/gpt-4o")).toBe(false);
      expect(isModelAllowedInPreview("anthropic/claude-3-opus")).toBe(false);
      expect(isModelAllowedInPreview("anthropic/claude-3-7-sonnet")).toBe(false);
    });
  });

  describe("validatePreviewParams", () => {
    it("validates allowed models", async () => {
      const { validatePreviewParams } = await import("../config/preview");
      const result = validatePreviewParams({
        models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-haiku"],
      });
      expect(result.valid).toBe(true);
    });

    it("rejects disallowed models", async () => {
      const { validatePreviewParams } = await import("../config/preview");
      const result = validatePreviewParams({
        models: ["openai/gpt-4o"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("not allowed in preview");
    });

    it("validates rounds within limits", async () => {
      const { validatePreviewParams, PREVIEW_CONFIG } = await import("../config/preview");
      const result = validatePreviewParams({
        rounds: PREVIEW_CONFIG.maxRounds,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects rounds exceeding limits", async () => {
      const { validatePreviewParams, PREVIEW_CONFIG } = await import("../config/preview");
      const result = validatePreviewParams({
        rounds: PREVIEW_CONFIG.maxRounds + 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("maximum");
    });

    it("validates participants within limits", async () => {
      const { validatePreviewParams, PREVIEW_CONFIG } = await import("../config/preview");
      const result = validatePreviewParams({
        participants: PREVIEW_CONFIG.maxParticipants,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects participants exceeding limits", async () => {
      const { validatePreviewParams, PREVIEW_CONFIG } = await import("../config/preview");
      const result = validatePreviewParams({
        participants: PREVIEW_CONFIG.maxParticipants + 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("maximum");
    });

    it("validates combined constraints", async () => {
      const { validatePreviewParams, PREVIEW_CONFIG } = await import("../config/preview");
      const result = validatePreviewParams({
        models: ["openai/gpt-4o-mini"],
        rounds: PREVIEW_CONFIG.maxRounds,
        participants: PREVIEW_CONFIG.maxParticipants,
      });
      expect(result.valid).toBe(true);
    });

    it("handles missing params gracefully", async () => {
      const { validatePreviewParams } = await import("../config/preview");
      const result = validatePreviewParams({});
      expect(result.valid).toBe(true);
    });
  });

  describe("isWithinPreviewLimits", () => {
    it("returns true for valid configurations", async () => {
      const { isWithinPreviewLimits, PREVIEW_ALLOWED_MODELS, PREVIEW_CONFIG } = await import("../config/preview");
      expect(
        isWithinPreviewLimits({
          models: PREVIEW_ALLOWED_MODELS as unknown as string[],
          rounds: PREVIEW_CONFIG.maxRounds,
          participants: PREVIEW_CONFIG.maxParticipants,
        })
      ).toBe(true);
    });

    it("returns false for invalid configurations", async () => {
      const { isWithinPreviewLimits, PREVIEW_CONFIG } = await import("../config/preview");
      expect(
        isWithinPreviewLimits({
          models: ["openai/gpt-4o"], // Not allowed
          rounds: PREVIEW_CONFIG.maxRounds,
          participants: PREVIEW_CONFIG.maxParticipants,
        })
      ).toBe(false);
    });
  });

  describe("PREVIEW_CONFIG constants", () => {
    it("has expected default values", async () => {
      const { PREVIEW_CONFIG } = await import("../config/preview");
      expect(PREVIEW_CONFIG.maxRuns).toBe(3);
      expect(PREVIEW_CONFIG.maxRounds).toBe(2);
      expect(PREVIEW_CONFIG.maxParticipants).toBe(2);
      expect(PREVIEW_CONFIG.allowedModels).toContain("openai/gpt-4o-mini");
      expect(PREVIEW_CONFIG.allowedModels).toContain("anthropic/claude-3.5-haiku");
    });
  });
});
