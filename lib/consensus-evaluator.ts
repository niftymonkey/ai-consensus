import { streamObject, streamText } from "ai";
import { z } from "zod";
import {
  buildEvaluationSystemPrompt,
  buildEvaluationPrompt,
} from "./consensus-prompts";
import type { ModelSelection } from "./types";
import { getModelInstance } from "./model-instance";

/**
 * Extract JSON from messy model output that may contain preamble text,
 * markdown code fences, or other extraneous content.
 *
 * This handles common issues with open-source models via OpenRouter that
 * don't properly follow structured output instructions.
 */
export function extractJsonFromText(text: string): unknown | null {
  // Try direct parse first
  try {
    return JSON.parse(text);
  } catch {
    // Continue to extraction attempts
  }

  // Remove markdown code fences if present
  let cleaned = text.replace(/```(?:json)?\s*/gi, '').replace(/```\s*$/gi, '');

  // Try parsing the cleaned text
  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue to more aggressive extraction
  }

  // Find the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');

  if (firstBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch {
      // Try fixing common issues
    }

    // Handle double opening braces like "{\n{"
    if (jsonCandidate.startsWith('{\n{') || jsonCandidate.startsWith('{ {')) {
      try {
        return JSON.parse(jsonCandidate.substring(jsonCandidate.indexOf('{', 1)));
      } catch {
        // Give up
      }
    }
  }

  return null;
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
 * Fallback evaluation using streamText when streamObject fails.
 * This handles models that don't properly support structured output.
 */
async function evaluateWithTextFallback(
  responses: Map<string, string>,
  selectedModels: ModelSelection[],
  consensusThreshold: number,
  evaluatorApiKey: string,
  evaluatorProvider: string,
  evaluatorModel: string,
  round: number,
  searchEnabled: boolean
): Promise<ConsensusEvaluation> {
  console.log(`[Evaluation Fallback] Using text generation for ${evaluatorModel}`);

  const model = getModelInstance(evaluatorApiKey, evaluatorProvider, evaluatorModel);
  const systemPrompt = buildEvaluationSystemPrompt(consensusThreshold, searchEnabled);
  const userPrompt = buildEvaluationPrompt(responses, selectedModels, round);

  const result = streamText({
    model,
    system: systemPrompt,
    prompt: userPrompt,
  });

  let fullText = "";
  for await (const chunk of result.textStream) {
    fullText += chunk;
  }

  // Try to extract JSON from the response
  const extracted = extractJsonFromText(fullText);
  if (!extracted) {
    console.error('[Evaluation Fallback] Could not extract JSON from response:', fullText.substring(0, 500));
    throw new Error('Could not parse evaluation response as JSON');
  }

  // Validate against schema
  const parseResult = consensusEvaluationSchema.safeParse(extracted);
  if (!parseResult.success) {
    console.error('[Evaluation Fallback] Schema validation failed:', parseResult.error.issues);
    throw new Error(`Evaluation response failed validation: ${parseResult.error.issues.map(i => i.message).join(', ')}`);
  }

  console.log('[Evaluation Fallback] Successfully extracted and validated evaluation');
  return parseResult.data;
}

/**
 * Evaluate consensus using streamObject - streams partial results as they generate.
 * Falls back to text generation with JSON extraction for models that don't support structured output.
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
  const model = getModelInstance(evaluatorApiKey, evaluatorProvider, evaluatorModel);

  // streamObject returns structured data incrementally
  const result = streamObject({
    model,
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
    // Check if this is a JSON parsing error - if so, try the fallback
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isParsingError = errorMessage.includes('parse') ||
                           errorMessage.includes('JSON') ||
                           errorMessage.includes('No object generated');

    if (isParsingError) {
      console.log('[Evaluation] streamObject failed with parsing error, trying text fallback...');
      try {
        return await evaluateWithTextFallback(
          responses,
          selectedModels,
          consensusThreshold,
          evaluatorApiKey,
          evaluatorProvider,
          evaluatorModel,
          round,
          searchEnabled
        );
      } catch (fallbackError) {
        console.error('[Evaluation] Text fallback also failed:', fallbackError);
        throw new Error(`Evaluation failed: Model output could not be parsed. Try using a different evaluator model (Claude, GPT-4, or Gemini recommended).`);
      }
    }

    console.error('[Evaluation] Failed to get final object:', error);
    throw new Error(`Evaluation failed: ${errorMessage}`);
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
