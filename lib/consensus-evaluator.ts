import { streamObject } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { z } from "zod";
import {
  buildEvaluationSystemPrompt,
  buildEvaluationPrompt,
} from "./consensus-prompts";
import type { ModelSelection } from "./types";
import { createOpenRouterProvider } from "./openrouter";

// Direct providers we support with API keys
const DIRECT_PROVIDERS = ["anthropic", "openai", "google"] as const;

/**
 * Get the appropriate model instance for a provider/model combination
 * Handles both direct providers and OpenRouter
 */
function getModelInstance(apiKey: string, provider: string, model: string) {
  const isDirectProvider = DIRECT_PROVIDERS.includes(provider as typeof DIRECT_PROVIDERS[number]);
  const isOpenRouterModel = model.includes("/"); // OpenRouter models have format "provider/model"

  // Use OpenRouter if model is in OpenRouter format or provider isn't direct
  if (isOpenRouterModel || !isDirectProvider) {
    const openrouterProvider = createOpenRouterProvider(apiKey);
    return openrouterProvider.chat(model);
  }

  // Use direct provider
  const providerInstance =
    provider === "anthropic"
      ? createAnthropic({ apiKey })
      : provider === "google"
        ? createGoogleGenerativeAI({ apiKey })
        : createOpenAI({ apiKey });

  return providerInstance(model);
}

// Zod schema for consensus evaluation (enforces structure)
export const consensusEvaluationSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Consensus score from 0-100, where 100 is perfect alignment"),

  // Fun, punchy summary
  summary: z
    .string()
    .describe("1-2 sentence conversational summary in casual language"),

  emoji: z
    .string()
    .describe("Single emoji: 🎉 (90-100), 👍 (75-89), 🤔 (50-74), ⚠️ (30-49), 💥 (0-29)"),

  vibe: z
    .enum(["celebration", "agreement", "mixed", "disagreement", "clash"])
    .describe("Overall feeling: celebration (90-100), agreement (75-89), mixed (50-74), disagreement (30-49), clash (0-29)"),

  // Agreement-first approach
  areasOfAgreement: z
    .array(z.string())
    .describe("3-5 things models agree on, even if minor. Celebrate commonality first!"),

  // Differences and detailed reasoning
  keyDifferences: z
    .array(z.string())
    .describe("3-5 dramatic differences. Use punchy, conversational language with personality"),

  reasoning: z
    .string()
    .describe("2-3 paragraph conversational explanation. Friendly tone, less academic"),

  isGoodEnough: z
    .boolean()
    .describe("Whether consensus is sufficient to stop iterating (true if score >= threshold)"),

  // Search request fields
  needsMoreInfo: z
    .boolean()
    .optional()
    .describe("True if any model needs more current/specific information to improve their answer"),

  suggestedSearchQuery: z
    .string()
    .optional()
    .describe("Focused web search query if needsMoreInfo is true"),
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
  evaluatorProvider: string,
  evaluatorModel: string,
  round: number,
  onPartialUpdate?: (partial: Partial<ConsensusEvaluation>) => void,
  searchEnabled: boolean = false
): Promise<ConsensusEvaluation> {
  // streamObject returns structured data incrementally
  const result = streamObject({
    model: getModelInstance(evaluatorApiKey, evaluatorProvider, evaluatorModel),
    schema: consensusEvaluationSchema,
    system: buildEvaluationSystemPrompt(consensusThreshold, searchEnabled),
    prompt: buildEvaluationPrompt(responses, selectedModels, round),
  });

  // Stream partial object updates
  if (onPartialUpdate) {
    try {
      for await (const partialObject of result.partialObjectStream) {
        onPartialUpdate({
          score: partialObject.score ?? 0,
          summary: partialObject.summary ?? "",
          emoji: partialObject.emoji ?? "🤔",
          vibe: partialObject.vibe ?? "mixed",
          areasOfAgreement: Array.isArray(partialObject.areasOfAgreement)
            ? partialObject.areasOfAgreement.filter((a): a is string => a !== undefined)
            : [],
          keyDifferences: Array.isArray(partialObject.keyDifferences)
            ? partialObject.keyDifferences.filter((d): d is string => d !== undefined)
            : [],
          reasoning: partialObject.reasoning ?? "",
          isGoodEnough: partialObject.isGoodEnough ?? false,
        });
      }
    } catch (error) {
      console.error('[Evaluation Stream] Partial stream error:', error);
      // Continue to result.object - it may still resolve
    }
  }

  // Return final structured object with timeout
  try {
    const finalObject = await Promise.race([
      result.object,
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Evaluation timeout after 2 minutes')), 120000)
      )
    ]);
    return finalObject;
  } catch (error) {
    console.error('[Evaluation] Failed to get final object:', error);
    throw new Error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Evaluate consensus without streaming (for simpler use cases)
 */
export async function evaluateConsensus(
  responses: Map<string, string>,
  selectedModels: ModelSelection[],
  consensusThreshold: number,
  evaluatorApiKey: string,
  evaluatorProvider: string,
  evaluatorModel: string,
  round: number
): Promise<ConsensusEvaluation> {
  return evaluateConsensusWithStream(
    responses,
    selectedModels,
    consensusThreshold,
    evaluatorApiKey,
    evaluatorProvider,
    evaluatorModel,
    round
  );
}
