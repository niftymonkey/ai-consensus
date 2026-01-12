import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  getTrialApiKey,
  isTrialEnabled,
  isModelAllowedInTrial,
  validateTrialParams,
  isWithinTrialLimits,
  TRIAL_CONFIG,
  TRIAL_ALLOWED_MODELS,
} from "../config/trial";

describe("Trial Configuration", () => {
  describe("getTrialApiKey", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns the API key when configured", () => {
      process.env.OPENROUTER_TRIAL_API_KEY = "sk-or-test-key";
      expect(getTrialApiKey()).toBe("sk-or-test-key");
    });

    it("throws when API key is not configured", () => {
      delete process.env.OPENROUTER_TRIAL_API_KEY;
      expect(() => getTrialApiKey()).toThrow(
        "OPENROUTER_TRIAL_API_KEY is not configured"
      );
    });
  });

  describe("isTrialEnabled", () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.resetModules();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it("returns true when API key is configured", () => {
      process.env.OPENROUTER_TRIAL_API_KEY = "sk-or-test-key";
      expect(isTrialEnabled()).toBe(true);
    });

    it("returns false when API key is not configured", () => {
      delete process.env.OPENROUTER_TRIAL_API_KEY;
      expect(isTrialEnabled()).toBe(false);
    });
  });

  describe("isModelAllowedInTrial", () => {
    it("returns true for allowed models", () => {
      expect(isModelAllowedInTrial("openai/gpt-4o-mini")).toBe(true);
      expect(isModelAllowedInTrial("anthropic/claude-3.5-haiku")).toBe(true);
    });

    it("returns false for non-allowed models", () => {
      expect(isModelAllowedInTrial("openai/gpt-4o")).toBe(false);
      expect(isModelAllowedInTrial("anthropic/claude-3-opus")).toBe(false);
      expect(isModelAllowedInTrial("anthropic/claude-3-7-sonnet")).toBe(false);
    });
  });

  describe("validateTrialParams", () => {
    it("validates allowed models", () => {
      const result = validateTrialParams({
        models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-haiku"],
      });
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("rejects non-allowed models", () => {
      const result = validateTrialParams({
        models: ["openai/gpt-4o", "anthropic/claude-3.5-haiku"],
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("openai/gpt-4o");
      expect(result.errors[0]).toContain("not allowed in trial");
    });

    it("validates rounds within limit", () => {
      const result = validateTrialParams({
        rounds: TRIAL_CONFIG.maxRounds,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects rounds exceeding limit", () => {
      const result = validateTrialParams({
        rounds: TRIAL_CONFIG.maxRounds + 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("maximum");
      expect(result.errors[0]).toContain("rounds");
    });

    it("validates participants within limit", () => {
      const result = validateTrialParams({
        participants: TRIAL_CONFIG.maxParticipants,
      });
      expect(result.valid).toBe(true);
    });

    it("rejects participants exceeding limit", () => {
      const result = validateTrialParams({
        participants: TRIAL_CONFIG.maxParticipants + 1,
      });
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain("maximum");
      expect(result.errors[0]).toContain("participants");
    });

    it("collects multiple errors", () => {
      const result = validateTrialParams({
        models: ["openai/gpt-4o"],
        rounds: 10,
        participants: 20,
      });
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });

    it("passes with empty params", () => {
      const result = validateTrialParams({});
      expect(result.valid).toBe(true);
    });
  });

  describe("isWithinTrialLimits", () => {
    it("returns true for valid params", () => {
      expect(
        isWithinTrialLimits({
          models: TRIAL_ALLOWED_MODELS as unknown as string[],
          rounds: TRIAL_CONFIG.maxRounds,
          participants: TRIAL_CONFIG.maxParticipants,
        })
      ).toBe(true);
    });

    it("returns false for invalid params", () => {
      expect(
        isWithinTrialLimits({
          rounds: 100,
        })
      ).toBe(false);
    });
  });

  describe("TRIAL_CONFIG constants", () => {
    it("has sensible default values", () => {
      expect(TRIAL_CONFIG.maxRuns).toBe(3);
      expect(TRIAL_CONFIG.maxRounds).toBe(2);
      expect(TRIAL_CONFIG.maxParticipants).toBe(5);
      expect(TRIAL_CONFIG.allowedModels).toContain("openai/gpt-4o-mini");
      expect(TRIAL_CONFIG.allowedModels).toContain("anthropic/claude-3.5-haiku");
    });
  });
});
