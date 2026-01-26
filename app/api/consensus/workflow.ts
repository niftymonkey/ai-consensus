/**
 * Consensus Workflow using Vercel Workflow DevKit
 *
 * This file contains the durable workflow for multi-round AI consensus.
 * Each "use step" creates a checkpoint that survives timeouts and crashes.
 *
 * IMPORTANT:
 * - Steps must be defined in the SAME FILE as the workflow for bundler discovery.
 * - Workflow functions CANNOT use streams - only step functions can.
 * - Each step that needs to emit events must call getWritable() internally.
 */

import { getWritable, fetch as workflowFetch } from "workflow";
import { streamText, streamObject, generateText, jsonSchema } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouterProvider, parseAIError } from "@/lib/openrouter";
import {
  getRouteForModel,
  isDirectProviderName,
  type KeySet,
} from "@/lib/model-routing";
import type { ModelSelection, ConsensusEvaluation, SearchData } from "@/lib/types";
import type { TavilySearchResult } from "@/lib/tavily";
import type { ConsensusEvent, TimingData } from "@/lib/consensus-events";
import {
  buildRefinementPrompt,
  buildPromptWithSearchContext,
  buildEvaluationSystemPrompt,
  buildEvaluationPrompt,
} from "@/lib/consensus-prompts";
import {
  saveConsensusRound,
  updateConversationResult,
} from "@/lib/consensus-db";
import { consensusEvaluationSchema } from "@/lib/consensus-evaluator";

// ============================================================================
// Types
// ============================================================================

export interface ConsensusWorkflowInput {
  prompt: string;
  models: ModelSelection[];
  maxRounds: number;
  consensusThreshold: number;
  evaluatorModel: string;
  evaluatorKey: string;
  evaluatorProvider: string;
  enableSearch: boolean;
  tavilyKey: string | null;
  useTargetedRefinement: boolean;
  keySet: KeySet;
  conversationId: number | null;
  isPreviewMode: boolean;
  previewUserIdentifier: string | null;
  startTime: number;
  userId: string;
}

interface RoundResult {
  round: number;
  responses: Record<string, string>;
  evaluation: ConsensusEvaluation;
  searchData?: SearchData;
  hasError: boolean;
}

interface ProviderInstances {
  anthropic: ReturnType<typeof createAnthropic> | null;
  openai: ReturnType<typeof createOpenAI> | null;
  google: ReturnType<typeof createGoogleGenerativeAI> | null;
  openrouter: ReturnType<typeof createOpenRouterProvider> | null;
}

// Timeout configuration
const MAX_DURATION_SECONDS = 800;
const WARNING_THRESHOLD_PERCENT = 75;
const CRITICAL_THRESHOLD_PERCENT = 90;

// Debug crash simulation
const CRASH_AFTER_STEP = process.env.WORKFLOW_CRASH_AFTER_STEP;

// JSON Schema for consensus evaluation
const consensusEvaluationJsonSchema = jsonSchema<ConsensusEvaluation>({
  type: "object",
  properties: {
    score: { type: "number", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    emoji: { type: "string" },
    vibe: { type: "string", enum: ["celebration", "agreement", "mixed", "disagreement", "clash"] },
    areasOfAgreement: { type: "array", items: { type: "string" } },
    keyDifferences: { type: "array", items: { type: "string" } },
    reasoning: { type: "string" },
    isGoodEnough: { type: "boolean" },
    needsMoreInfo: { type: "boolean" },
    suggestedSearchQuery: { type: "string" },
  },
  required: ["score", "summary", "emoji", "vibe", "areasOfAgreement", "keyDifferences", "reasoning", "isGoodEnough", "needsMoreInfo", "suggestedSearchQuery"],
  additionalProperties: false,
});

// ============================================================================
// Helper Functions (used inside steps)
// ============================================================================

function createProviderInstances(keySet: KeySet, customFetch: typeof fetch): ProviderInstances {
  return {
    anthropic: keySet.anthropic ? createAnthropic({ apiKey: keySet.anthropic, fetch: customFetch }) : null,
    openai: keySet.openai ? createOpenAI({ apiKey: keySet.openai, fetch: customFetch }) : null,
    google: keySet.google ? createGoogleGenerativeAI({ apiKey: keySet.google, fetch: customFetch }) : null,
    openrouter: keySet.openrouter ? createOpenRouterProvider(keySet.openrouter, customFetch) : null,
  };
}

function getProviderForModel(
  modelId: string,
  keySet: KeySet,
  providers: ProviderInstances
): { instance: any; provider: string; modelId: string; source: "direct" | "openrouter" } | null {
  const route = getRouteForModel(modelId, keySet);
  if (!route) return null;

  if (route.source === "direct") {
    const instance = providers[route.provider as keyof typeof providers];
    if (!instance) return null;
    return { instance, provider: route.provider, modelId: route.modelId, source: "direct" };
  }

  if (providers.openrouter) {
    return { instance: providers.openrouter, provider: route.provider, modelId: route.modelId, source: "openrouter" };
  }

  return null;
}

function createTimingData(step: string, startTime: number): TimingData {
  const now = Date.now();
  const elapsedMs = now - startTime;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  const remainingSeconds = MAX_DURATION_SECONDS - elapsedSeconds;
  const percentUsed = Math.round((elapsedSeconds / MAX_DURATION_SECONDS) * 100);

  let warning: string | undefined;
  if (percentUsed >= CRITICAL_THRESHOLD_PERCENT) {
    warning = `CRITICAL: ${percentUsed}% of timeout used (${remainingSeconds}s remaining)`;
    console.warn(`[Timing] ${warning} - Step: ${step}`);
  } else if (percentUsed >= WARNING_THRESHOLD_PERCENT) {
    warning = `WARNING: ${percentUsed}% of timeout used (${remainingSeconds}s remaining)`;
    console.warn(`[Timing] ${warning} - Step: ${step}`);
  } else {
    console.log(`[Timing] Step "${step}" - ${elapsedSeconds}s elapsed (${percentUsed}% of ${MAX_DURATION_SECONDS}s limit)`);
  }

  return { step, elapsedMs, elapsedSeconds, remainingSeconds, percentUsed, warning };
}

function checkDebugCrash(stepName: string): void {
  if (CRASH_AFTER_STEP && stepName === CRASH_AFTER_STEP) {
    console.error(`[DEBUG] Simulating crash after step: ${stepName}`);
    throw new Error(`DEBUG: Simulated crash after ${stepName}`);
  }
}

// ============================================================================
// Step Functions (all streaming happens inside steps)
// ============================================================================

/**
 * Emit the start event
 */
async function emitStartEventStep(
  conversationId: number | null,
  startTime: number
): Promise<void> {
  "use step";

  const writable = getWritable();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const event: ConsensusEvent = { type: "start", conversationId };
  await writer.write(encoder.encode(JSON.stringify(event) + "\n"));

  const timing = createTimingData("workflow_start", startTime);
  const timingEvent: ConsensusEvent = { type: "timing", data: timing };
  await writer.write(encoder.encode(JSON.stringify(timingEvent) + "\n"));

  checkDebugCrash("workflow_start");
  await writer.releaseLock();
}

/**
 * Execute a complete round: search + model calls + evaluation
 * All streaming happens inside this step
 */
async function executeRoundStep(
  round: number,
  input: ConsensusWorkflowInput,
  previousResponses: Record<string, string>,
  previousEvaluation: ConsensusEvaluation | null
): Promise<RoundResult> {
  "use step";

  const writable = getWritable();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (event: ConsensusEvent) => {
    await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  };

  // Round status
    await emit({
      type: "round-status",
      data: {
        roundNumber: round,
        maxRounds: input.maxRounds,
        status: round === 1 ? "Initial responses" : "Refining responses",
      },
    });

    // ========== Search Phase ==========
    let searchData: SearchData | null = null;

    if (input.enableSearch && input.tavilyKey) {
      let shouldSearch = false;
      let searchQuery: string | null = null;

      if (round === 1) {
        // Check if question needs current info
        const { getModelInstance } = await import("@/lib/model-instance");
        const result = await generateText({
          model: getModelInstance(input.evaluatorKey, input.evaluatorProvider, input.evaluatorModel, workflowFetch),
          system: `You are a search necessity evaluator. Determine if a question requires current, up-to-date web information to answer well. Return ONLY "yes" or "no".`,
          prompt: input.prompt,
        });
        shouldSearch = result.text.trim().toLowerCase() === "yes";

        if (shouldSearch) {
          const queryResult = await generateText({
            model: getModelInstance(input.evaluatorKey, input.evaluatorProvider, input.evaluatorModel, workflowFetch),
            system: `Generate a focused web search query (3-8 words) for this question. Return ONLY the search query.`,
            prompt: input.prompt,
          });
          searchQuery = queryResult.text.trim();
        }
      } else if (previousEvaluation?.needsMoreInfo && previousEvaluation?.suggestedSearchQuery) {
        shouldSearch = true;
        searchQuery = previousEvaluation.suggestedSearchQuery;
      }

      if (shouldSearch && searchQuery) {
        await emit({ type: "search-start", data: { query: searchQuery, round } });

        try {
          const response = await workflowFetch("https://api.tavily.com/search", {
            method: "POST",
            headers: { "Authorization": `Bearer ${input.tavilyKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({ query: searchQuery, max_results: 5, search_depth: "basic", include_answer: false }),
          });

          if (response.ok) {
            const data = await response.json() as { results: TavilySearchResult[] };
            searchData = {
              query: searchQuery,
              results: data.results,
              round,
              triggeredBy: round === 1 ? "user" : "model",
            };
            await emit({ type: "search-complete", data: { results: data.results, round } });
          }
        } catch (error) {
          console.error(`[Round ${round}] Search error:`, error);
          await emit({ type: "search-error", data: { error: error instanceof Error ? error.message : "Search failed", round } });
        }
      }
    }

    // Timing after search
    if (input.enableSearch) {
      const timing = createTimingData(`round_${round}_search`, input.startTime);
      await emit({ type: "timing", data: timing });
      checkDebugCrash(`round_${round}_search`);
    }

    // ========== Model Responses Phase (Parallel) ==========
    const providers = createProviderInstances(input.keySet, workflowFetch);
    const roundResponses: Record<string, string> = {};
    let hasError = false;

    // Build prompts and start all model calls in parallel
    const modelPromises = input.models.map(async (model) => {
      const providerInfo = getProviderForModel(model.modelId, input.keySet, providers);

      if (!providerInfo) {
        roundResponses[model.id] = `[Error: Provider not configured for ${model.label}]`;
        hasError = true;
        await emit({
          type: "model-error",
          data: { modelId: model.id, modelLabel: model.label, error: `Provider not configured`, errorType: "provider_not_found", round },
        });
        return;
      }

      // Build prompt
      let promptText = round === 1
        ? input.prompt
        : buildRefinementPrompt(
            input.prompt,
            model.id,
            model.label,
            new Map(Object.entries(previousResponses)),
            input.models,
            round,
            input.useTargetedRefinement ? previousEvaluation : undefined
          );

      if (searchData) {
        promptText = buildPromptWithSearchContext(promptText, searchData.results);
      }

      try {
        console.log(`[Model Call] Round ${round}: Calling ${model.modelId} via ${providerInfo.source} (${model.label})`);

        const modelInstance = providerInfo.source === "openrouter"
          ? providerInfo.instance.chat(providerInfo.modelId)
          : providerInfo.instance(providerInfo.modelId);

        const result = await streamText({ model: modelInstance, prompt: promptText });

        let fullResponse = "";
        for await (const chunk of result.textStream) {
          fullResponse += chunk;
          await emit({
            type: "model-response",
            data: { modelId: model.id, modelLabel: model.label, content: fullResponse, round },
          });
        }

        roundResponses[model.id] = fullResponse;
        await emit({ type: "model-complete", data: { modelId: model.id, round } });
      } catch (error) {
        console.error(`[Model ${model.modelId}] Failed:`, error);
        const parsedError = parseAIError(error);
        roundResponses[model.id] = `[Error: ${model.label} did not respond]`;
        hasError = true;
        await emit({
          type: "model-error",
          data: { modelId: model.id, modelLabel: model.label, error: parsedError.message, errorType: parsedError.type || "generic", round },
        });
      }
    });

    // Wait for all models to complete
    await Promise.all(modelPromises);

    // Timing after models
    const modelsTiming = createTimingData(`round_${round}_models`, input.startTime);
    await emit({ type: "timing", data: modelsTiming });
    checkDebugCrash(`round_${round}_models`);

    // Check for failures
    const failedModels = input.models.filter((m) => roundResponses[m.id]?.startsWith("[Error:"));
    if (failedModels.length > 0) {
      const failedNames = failedModels.map((m) => m.label).join(", ");
      await emit({
        type: "error",
        data: {
          message: failedModels.length === input.models.length
            ? "All models failed to respond."
            : `Consensus cancelled: ${failedNames} failed.`,
          round,
        },
      });
      await writer.releaseLock();
      return { round, responses: roundResponses, evaluation: {} as ConsensusEvaluation, hasError: true };
    }

    // ========== Evaluation Phase ==========
    await emit({ type: "evaluation-start", round });

    console.log(`[Round ${round}] Evaluating consensus`);

    const { getModelInstance } = await import("@/lib/model-instance");
    const evalModel = getModelInstance(input.evaluatorKey, input.evaluatorProvider, input.evaluatorModel, workflowFetch);
    const responsesMap = new Map(Object.entries(roundResponses));

    const evalResult = streamObject({
      model: evalModel,
      schema: consensusEvaluationJsonSchema,
      system: buildEvaluationSystemPrompt(input.consensusThreshold, input.enableSearch),
      prompt: buildEvaluationPrompt(responsesMap, input.models, round),
    });

    let evaluation: ConsensusEvaluation;
    try {
      for await (const partial of evalResult.partialObjectStream) {
        await emit({
          type: "evaluation",
          data: {
            score: partial.score ?? 0,
            summary: partial.summary ?? "",
            emoji: partial.emoji ?? "",
            vibe: partial.vibe ?? "mixed",
            areasOfAgreement: (partial.areasOfAgreement || []).filter((a): a is string => a !== undefined),
            keyDifferences: (partial.keyDifferences || []).filter((d): d is string => d !== undefined),
            reasoning: partial.reasoning ?? "",
            isGoodEnough: partial.isGoodEnough ?? false,
          },
          round,
        });
      }
      evaluation = await evalResult.object;
    } catch (error) {
      console.error(`[Round ${round}] Evaluation failed:`, error);
      evaluation = {
        score: 0,
        summary: "Evaluation failed",
        emoji: "!",
        vibe: "clash",
        areasOfAgreement: [],
        keyDifferences: ["Evaluation could not be completed"],
        reasoning: error instanceof Error ? error.message : "Unknown error",
        isGoodEnough: false,
        needsMoreInfo: false,
        suggestedSearchQuery: "",
      };
    }

    await emit({ type: "evaluation-complete", round });

    // Timing after evaluation
    const evalTiming = createTimingData(`round_${round}_evaluation`, input.startTime);
    await emit({ type: "timing", data: evalTiming });
    checkDebugCrash(`round_${round}_evaluation`);

    console.log(`[Round ${round}] Score: ${evaluation.score}%`);

    // Save to DB if needed
    if (input.conversationId !== null) {
      await saveConsensusRound(input.conversationId, {
        roundNumber: round,
        modelResponses: roundResponses,
        evaluation: { reasoning: evaluation.reasoning, keyDifferences: evaluation.keyDifferences, score: evaluation.score },
      });
    }

  await writer.releaseLock();
  return { round, responses: roundResponses, evaluation, searchData: searchData || undefined, hasError: false };
}

/**
 * Generate and stream the final synthesis
 */
async function executeSynthesisStep(
  originalPrompt: string,
  finalResponses: Record<string, string>,
  models: ModelSelection[],
  evaluatorKey: string,
  evaluatorProvider: string,
  evaluatorModel: string,
  startTime: number,
  roundsCompleted: number,
  finalScore: number
): Promise<string> {
  "use step";

  const writable = getWritable();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (event: ConsensusEvent) => {
    await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  };

  await emit({ type: "synthesis-start" });

  console.log(`[Synthesis] Generating final consensus`);

  const { getModelInstance } = await import("@/lib/model-instance");
  const model = getModelInstance(evaluatorKey, evaluatorProvider, evaluatorModel, workflowFetch);

  const responsesText = models.map((m) => `${m.label}:\n${finalResponses[m.id]}`).join("\n\n---\n\n");

  const synthesisPrompt = `You are synthesizing a consensus response from ${models.length} AI models.

Original Question: ${originalPrompt}

Final Responses:
---
${responsesText}

Create a single, unified response that:
1. Incorporates the key insights from all models
2. Presents a balanced, consensus view
3. Acknowledges any remaining differences if they exist
4. Provides a clear, coherent answer
5. Does NOT use any emojis or unicode symbols

Generate the consensus response:`;

  const result = await streamText({ model, prompt: synthesisPrompt });

  let synthesis = "";
  for await (const chunk of result.textStream) {
    synthesis += chunk;
    await emit({ type: "synthesis-chunk", content: chunk });
  }

  console.log(`[Synthesis] Complete`);

  // Timing after synthesis
  const timing = createTimingData("synthesis", startTime);
  await emit({ type: "timing", data: timing });
  checkDebugCrash("synthesis");

  await writer.releaseLock();
  return synthesis;
}

/**
 * Generate and stream progression summary
 */
async function executeProgressionSummaryStep(
  originalPrompt: string,
  roundsData: RoundResult[],
  models: ModelSelection[],
  evaluatorKey: string,
  evaluatorProvider: string,
  evaluatorModel: string,
  startTime: number
): Promise<string> {
  "use step";

  const writable = getWritable();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (event: ConsensusEvent) => {
    await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  };

  try {
    await emit({ type: "progression-summary-start" });

    const { getModelInstance } = await import("@/lib/model-instance");
    const model = getModelInstance(evaluatorKey, evaluatorProvider, evaluatorModel, workflowFetch);

    const formatRound = (r: RoundResult): string => {
      const excerpts = models.map((m) => {
        const resp = r.responses[m.id] || "";
        return `  - **${m.label}**: ${resp.length > 300 ? resp.substring(0, 300) + "..." : resp}`;
      }).join("\n");
      return `**Round ${r.round}**:\n- Score: ${r.evaluation.score}%\n- Summary: ${r.evaluation.summary}\n\n${excerpts}`;
    };

    const roundsSummary = roundsData.map(formatRound).join("\n\n---\n\n");

    const progressionPrompt = `Analyze how AI models evolved across ${roundsData.length} rounds of consensus-building.

Original Question: ${originalPrompt}

Rounds Data:
---
${roundsSummary}

Create a 2-4 paragraph narrative summary. Use markdown formatting. No emojis.`;

    const result = await streamText({ model, prompt: progressionPrompt });

    let summary = "";
    for await (const chunk of result.textStream) {
      summary += chunk;
      await emit({ type: "progression-summary-chunk", content: chunk });
    }

    // Timing
    const timing = createTimingData("progression_summary", startTime);
    await emit({ type: "timing", data: timing });
    checkDebugCrash("progression_summary");

    await writer.releaseLock();
    return summary;
  } catch (error) {
    console.error("[Progression Summary] Failed:", error);
    await writer.releaseLock();
    return `Unable to generate progression summary. The consensus evolved across ${roundsData.length} rounds.`;
  }
}

/**
 * Emit refinement prompts event for non-final rounds
 * This signals to the frontend that the round is complete and should be saved
 */
async function emitRefinementPromptsStep(
  round: number,
  input: ConsensusWorkflowInput,
  responses: Record<string, string>,
  evaluation: ConsensusEvaluation
): Promise<void> {
  "use step";

  const writable = getWritable();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  // Generate refinement prompts for each model
  const refinementPrompts: Record<string, string> = {};
  for (const model of input.models) {
    refinementPrompts[model.id] = buildRefinementPrompt(
      input.prompt,
      model.id,
      model.label,
      new Map(Object.entries(responses)),
      input.models,
      round + 1, // Next round
      input.useTargetedRefinement ? evaluation : undefined
    );
  }

  const event: ConsensusEvent = {
    type: "refinement-prompts",
    data: refinementPrompts,
    round,
  };
  await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  await writer.releaseLock();
}

/**
 * Emit final events and close the stream
 */
async function emitFinalEventsStep(
  finalResponses: Record<string, string>,
  conversationId: number | null,
  synthesis: string,
  finalScore: number,
  roundsCompleted: number,
  startTime: number,
  isPreviewMode: boolean,
  previewUserIdentifier: string | null
): Promise<void> {
  "use step";

  const writable = getWritable();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const emit = async (event: ConsensusEvent) => {
    await writer.write(encoder.encode(JSON.stringify(event) + "\n"));
  };

  // Update DB with final result
  if (conversationId !== null) {
    await updateConversationResult(conversationId, synthesis, finalScore, roundsCompleted);
  }

  // Increment preview usage
  if (isPreviewMode && previewUserIdentifier) {
    const { incrementPreviewUsage } = await import("@/lib/preview-db");
    await incrementPreviewUsage(previewUserIdentifier);
    console.log(`[Consensus] Preview run counted`);
  }

  // Final events
  await emit({ type: "final-responses", data: finalResponses });

  // Final timing
  const timing = createTimingData("workflow_complete", startTime);
  await emit({ type: "timing", data: timing });
  checkDebugCrash("workflow_complete");

  await emit({ type: "complete" });

  await writer.close();
}

// ============================================================================
// Main Workflow (no streaming here - only step coordination)
// ============================================================================

export async function runConsensusWorkflow(input: ConsensusWorkflowInput) {
  "use workflow";

  const allRoundsData: RoundResult[] = [];
  let previousResponses: Record<string, string> = {};
  let previousEvaluation: ConsensusEvaluation | null = null;
  let isGoodEnough = false;
  let finalScore = 0;

  // Step 1: Emit start event
  await emitStartEventStep(input.conversationId, input.startTime);

  // Step 2: Execute rounds
  for (let round = 1; round <= input.maxRounds && !isGoodEnough; round++) {
    const roundResult = await executeRoundStep(
      round,
      input,
      previousResponses,
      previousEvaluation
    );

    if (roundResult.hasError) {
      // Error already emitted in step, just return
      return { synthesis: "", finalScore: 0, roundsCompleted: round };
    }

    allRoundsData.push(roundResult);
    finalScore = roundResult.evaluation.score;
    isGoodEnough = roundResult.evaluation.score >= input.consensusThreshold;

    console.log(`[Round ${round}] Consensus ${isGoodEnough ? "reached" : "not reached"} (${roundResult.evaluation.score}% vs ${input.consensusThreshold}%)`);

    if (!isGoodEnough && round < input.maxRounds) {
      // Emit refinement prompts to signal round completion to frontend
      await emitRefinementPromptsStep(round, input, roundResult.responses, roundResult.evaluation);
      previousResponses = roundResult.responses;
      previousEvaluation = roundResult.evaluation;
    }
  }

  // Step 3: Synthesis
  const lastRoundResponses = allRoundsData[allRoundsData.length - 1].responses;
  const synthesis = await executeSynthesisStep(
    input.prompt,
    lastRoundResponses,
    input.models,
    input.evaluatorKey,
    input.evaluatorProvider,
    input.evaluatorModel,
    input.startTime,
    allRoundsData.length,
    finalScore
  );

  // Step 4: Progression summary (if multiple rounds)
  if (allRoundsData.length > 1) {
    await executeProgressionSummaryStep(
      input.prompt,
      allRoundsData,
      input.models,
      input.evaluatorKey,
      input.evaluatorProvider,
      input.evaluatorModel,
      input.startTime
    );
  }

  // Step 5: Final events
  await emitFinalEventsStep(
    lastRoundResponses,
    input.conversationId,
    synthesis,
    finalScore,
    allRoundsData.length,
    input.startTime,
    input.isPreviewMode,
    input.previewUserIdentifier
  );

  return { synthesis, finalScore, roundsCompleted: allRoundsData.length };
}
