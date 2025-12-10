import { streamObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { z } from "zod";
import {
  buildEvaluationSystemPrompt,
  buildEvaluationPrompt,
} from "./consensus-prompts";
import type { ModelSelection } from "./types";

// Zod schema for consensus evaluation (enforces structure)
export const consensusEvaluationSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Consensus score from 0-100, where 100 is perfect alignment"),
  reasoning: z
    .string()
    .describe("Detailed explanation of why this score was assigned"),
  keyDifferences: z
    .array(z.string())
    .describe("List of main points where the models disagree or diverge"),
  isGoodEnough: z
    .boolean()
    .describe(
      "Whether consensus is sufficient to stop iterating (true if score >= threshold)"
    ),
});

export type ConsensusEvaluation = z.infer<typeof consensusEvaluationSchema>;

/**
 * Evaluate consensus using streamObject - streams partial results as they generate
 */
export async function evaluateConsensusWithStream(
  responses: Map<string, string>,
  selectedModels: ModelSelection[],
  consensusThreshold: number,
  evaluatorApiKey: string,
  evaluatorProvider: "anthropic" | "openai",
  round: number,
  onPartialUpdate?: (partial: Partial<ConsensusEvaluation>) => void
): Promise<ConsensusEvaluation> {
  // Create provider instance
  const provider =
    evaluatorProvider === "anthropic"
      ? createAnthropic({ apiKey: evaluatorApiKey })
      : createOpenAI({ apiKey: evaluatorApiKey });

  // Choose model based on provider
  const modelId =
    evaluatorProvider === "anthropic"
      ? "claude-3-7-sonnet-20250219"
      : "gpt-4o";

  // streamObject returns structured data incrementally
  const result = streamObject({
    model: provider(modelId),
    schema: consensusEvaluationSchema,
    system: buildEvaluationSystemPrompt(consensusThreshold),
    prompt: buildEvaluationPrompt(responses, selectedModels, round),
  });

  // Stream partial object updates
  if (onPartialUpdate) {
    for await (const partialObject of result.partialObjectStream) {
      onPartialUpdate({
        score: partialObject.score ?? 0,
        reasoning: partialObject.reasoning ?? "",
        keyDifferences: Array.isArray(partialObject.keyDifferences)
          ? partialObject.keyDifferences.filter((d): d is string => d !== undefined)
          : [],
        isGoodEnough: partialObject.isGoodEnough ?? false,
      });
    }
  }

  // Return final structured object (guaranteed to match schema)
  return await result.object;
}

/**
 * Evaluate consensus without streaming (for simpler use cases)
 */
export async function evaluateConsensus(
  responses: Map<string, string>,
  selectedModels: ModelSelection[],
  consensusThreshold: number,
  evaluatorApiKey: string,
  evaluatorProvider: "anthropic" | "openai",
  round: number
): Promise<ConsensusEvaluation> {
  return evaluateConsensusWithStream(
    responses,
    selectedModels,
    consensusThreshold,
    evaluatorApiKey,
    evaluatorProvider,
    round
  );
}
