/**
 * Consensus Prompts Tests
 *
 * Tests for buildRefinementPrompt function including targeted refinement with evaluation insights.
 */

import { describe, it, expect } from "vitest";
import { buildRefinementPrompt } from "../consensus-prompts";
import type { ModelSelection, ConsensusEvaluation } from "../types";

describe("buildRefinementPrompt", () => {
  const mockModels: ModelSelection[] = [
    { id: "model-1", provider: "openai", modelId: "gpt-4o", label: "GPT-4o" },
    {
      id: "model-2",
      provider: "anthropic",
      modelId: "claude-sonnet",
      label: "Claude Sonnet",
    },
  ];

  const mockResponses = new Map([
    ["model-1", "Response from GPT-4o"],
    ["model-2", "Response from Claude Sonnet"],
  ]);

  const mockEvaluation: ConsensusEvaluation = {
    score: 65,
    summary: "Models agree on basics but differ on approach",
    emoji: "🤔",
    vibe: "mixed",
    areasOfAgreement: [
      "Both identify the core problem",
      "Both suggest iterative approach",
    ],
    keyDifferences: [
      "GPT wants to start with X, Claude prefers Y",
      "Different views on timeline",
    ],
    reasoning: "The models have some common ground but diverge on specifics.",
    isGoodEnough: false,
  };

  it("includes original prompt and round number", () => {
    const result = buildRefinementPrompt(
      "What is the best approach?",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2
    );
    expect(result).toContain("What is the best approach?");
    expect(result).toContain("Round 2");
  });

  it("includes own previous response", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2
    );
    expect(result).toContain("Response from GPT-4o");
    expect(result).toContain("## Your Previous Response");
  });

  it("includes other models responses but not own response in others section", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2
    );
    expect(result).toContain("CLAUDE SONNET:");
    expect(result).toContain("Response from Claude Sonnet");
    // Own response should not be in "other models" section
    const otherModelsSection = result.split("## Other Models' Responses")[1];
    expect(otherModelsSection).not.toContain("GPT-4O:");
  });

  it("uses generic instructions when no evaluation provided", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2
    );
    expect(result).toContain("Address any divergences or disagreements");
    expect(result).not.toContain("Evaluator Insights");
  });

  it("includes evaluation insights when evaluation provided", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      mockEvaluation
    );
    expect(result).toContain("Evaluator Insights");
    expect(result).toContain("GPT wants to start with X, Claude prefers Y");
    expect(result).toContain("Both identify the core problem");
  });

  it("uses targeted instructions when evaluation provided", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      mockEvaluation
    );
    expect(result).toContain(
      "Focus on resolving the key differences identified above"
    );
    expect(result).toContain("Build on the areas of agreement");
  });

  it("still includes full responses when evaluation provided", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      mockEvaluation
    );
    // Should have both evaluation insights AND full responses
    expect(result).toContain("Evaluator Insights");
    expect(result).toContain("Response from Claude Sonnet");
    expect(result).toContain("## Your Previous Response");
  });

  it("handles null evaluation same as undefined", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      null
    );
    expect(result).toContain("Address any divergences or disagreements");
    expect(result).not.toContain("Evaluator Insights");
  });

  it("handles empty keyDifferences array gracefully", () => {
    const evalWithEmptyDifferences: ConsensusEvaluation = {
      ...mockEvaluation,
      keyDifferences: [],
    };
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      evalWithEmptyDifferences
    );
    expect(result).toContain("Evaluator Insights");
    expect(result).toContain("Both identify the core problem");
  });

  it("handles empty areasOfAgreement array gracefully", () => {
    const evalWithEmptyAgreement: ConsensusEvaluation = {
      ...mockEvaluation,
      areasOfAgreement: [],
    };
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      evalWithEmptyAgreement
    );
    expect(result).toContain("Evaluator Insights");
    expect(result).toContain("GPT wants to start with X, Claude prefers Y");
  });

  it("tells the model which name refers to them in evaluation", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      mockEvaluation
    );
    expect(result).toContain("You are GPT-4o");
  });

  it("has separator before refinement instructions", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      mockEvaluation
    );
    expect(result).toContain("---\n\nPlease refine");
  });

  it("does not end with a colon", () => {
    const result = buildRefinementPrompt(
      "Test prompt",
      "model-1",
      "GPT-4o",
      mockResponses,
      mockModels,
      2,
      mockEvaluation
    );
    expect(result.endsWith(":")).toBe(false);
  });
});
