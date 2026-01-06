/**
 * Consensus Validation Tests
 *
 * Tests for validating consensus UI state before submission.
 */

import { describe, it, expect } from "vitest";
import {
  getConsensusValidationErrors,
  isConsensusReady,
  type ConsensusState,
} from "../consensus-validation";

describe("getConsensusValidationErrors", () => {
  describe("model validation", () => {
    it("returns error when no models selected", () => {
      const state: ConsensusState = {
        models: [],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Select at least 2 models");
    });

    it("returns error when only 1 model selected", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Select at least 2 models");
    });

    it("accepts 2 models", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).not.toContain("Select at least 2 models");
    });

    it("accepts 3 models", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o", "google/gemini-2.5-flash"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).not.toContain("Select at least 2 models");
    });

    it("returns error when more than 3 models selected", () => {
      const state: ConsensusState = {
        models: [
          "anthropic/claude-3.7-sonnet",
          "openai/gpt-4o",
          "google/gemini-2.5-flash",
          "meta-llama/llama-4-scout",
        ],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Select at most 3 models");
    });
  });

  describe("evaluator validation", () => {
    it("returns error when no evaluator selected", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: null,
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Select an evaluator model");
    });

    it("returns error when evaluator is empty string", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Select an evaluator model");
    });

    it("accepts valid evaluator", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).not.toContain("Select an evaluator model");
    });
  });

  describe("prompt validation", () => {
    it("returns error when prompt is empty", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Enter a question");
    });

    it("returns error when prompt is only whitespace", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "   \n\t  ",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Enter a question");
    });

    it("accepts valid prompt", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).not.toContain("Enter a question");
    });
  });

  describe("multiple errors", () => {
    it("returns all applicable errors", () => {
      const state: ConsensusState = {
        models: [],
        evaluator: null,
        prompt: "",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toContain("Select at least 2 models");
      expect(errors).toContain("Select an evaluator model");
      expect(errors).toContain("Enter a question");
      expect(errors).toHaveLength(3);
    });

    it("returns empty array when all valid", () => {
      const state: ConsensusState = {
        models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
        evaluator: "anthropic/claude-3.7-sonnet",
        prompt: "What is the meaning of life?",
      };
      const errors = getConsensusValidationErrors(state);
      expect(errors).toHaveLength(0);
    });
  });
});

describe("isConsensusReady", () => {
  it("returns true when no validation errors", () => {
    const state: ConsensusState = {
      models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
      evaluator: "anthropic/claude-3.7-sonnet",
      prompt: "What is the meaning of life?",
    };
    expect(isConsensusReady(state)).toBe(true);
  });

  it("returns false when there are validation errors", () => {
    const state: ConsensusState = {
      models: [],
      evaluator: null,
      prompt: "",
    };
    expect(isConsensusReady(state)).toBe(false);
  });

  it("returns false with partial validity", () => {
    const state: ConsensusState = {
      models: ["anthropic/claude-3.7-sonnet", "openai/gpt-4o"],
      evaluator: "anthropic/claude-3.7-sonnet",
      prompt: "", // Invalid
    };
    expect(isConsensusReady(state)).toBe(false);
  });
});
