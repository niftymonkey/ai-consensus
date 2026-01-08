import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { evaluateConsensusWithStream } from "@/lib/consensus-evaluator";
import { buildRefinementPrompt, buildPromptWithSearchContext } from "@/lib/consensus-prompts";
import type { ModelSelection, ConsensusEvaluation, SearchData } from "@/lib/types";
import {
  createConsensusConversation,
  saveConsensusRound,
  updateConversationResult,
} from "@/lib/consensus-db";
import { searchTavily } from "@/lib/tavily";
import { generateSearchQuery, shouldSearchWeb } from "@/lib/search-query-generator";
import { createOpenRouterProvider, parseAIError } from "@/lib/openrouter";
import { getRouteForModel, extractProvider, type KeySet } from "@/lib/model-routing";
import { sendEvent, type ConsensusEvent } from "@/lib/consensus-events";
import { logger } from "@/lib/logger";
import { z } from "zod";

export const maxDuration = 600; // 10 minutes for multiple rounds
export const runtime = "nodejs";

// Zod schema for request validation
const ModelSelectionSchema = z.object({
  id: z.string().min(1).max(200),
  provider: z.string().min(1).max(50),
  modelId: z.string().min(1).max(200),
  label: z.string().min(1).max(100),
});

const ConsensusRequestSchema = z.object({
  prompt: z.string().min(1, "Prompt is required").max(50000, "Prompt too long"),
  models: z.union([
    z.tuple([ModelSelectionSchema, ModelSelectionSchema]),
    z.tuple([ModelSelectionSchema, ModelSelectionSchema, ModelSelectionSchema]),
  ]),
  maxRounds: z.number().int().min(1).max(10).default(3),
  consensusThreshold: z.number().int().min(0).max(100).default(80),
  evaluatorModel: z.string().max(200).default("claude-3-7-sonnet-20250219"),
  enableSearch: z.boolean().default(false),
});

type ConsensusRequest = z.infer<typeof ConsensusRequestSchema>;

/**
 * POST /api/consensus - Multi-round consensus workflow
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    // Validate request body with Zod schema
    const parseResult = ConsensusRequestSchema.safeParse(await request.json());
    if (!parseResult.success) {
      const errorMessage = parseResult.error.issues
        .map((e) => `${e.path.join(".")}: ${e.message}`)
        .join(", ");
      return new Response(
        JSON.stringify({ error: `Invalid request: ${errorMessage}` }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const {
      prompt,
      models,
      maxRounds,
      consensusThreshold,
      evaluatorModel,
      enableSearch,
    } = parseResult.data;

    // Get user's API keys
    const keys = await getApiKeys(session.user.id);

    // Validate Tavily key if search enabled
    const tavilyKey = enableSearch ? keys.tavily : null;
    if (enableSearch && !tavilyKey) {
      return new Response(
        JSON.stringify({ error: "Missing Tavily API key for web search. Please add your key in settings." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log request summary
    console.log(`[Consensus] Starting: ${models.length} models, evaluator=${evaluatorModel}, maxRounds=${maxRounds}, threshold=${consensusThreshold}%, search=${enableSearch}`);

    // Create provider instances based on available keys
    // Direct provider keys take precedence over OpenRouter
    const providerInstances = {
      anthropic: keys.anthropic
        ? createAnthropic({ apiKey: keys.anthropic })
        : null,
      openai: keys.openai ? createOpenAI({ apiKey: keys.openai }) : null,
      google: keys.google
        ? createGoogleGenerativeAI({ apiKey: keys.google })
        : null,
    };

    // Create OpenRouter instance if key is available (used as fallback)
    const openrouterInstance = keys.openrouter
      ? createOpenRouterProvider(keys.openrouter)
      : null;

    // Build KeySet for routing decisions
    const keySet: KeySet = {
      anthropic: keys.anthropic,
      openai: keys.openai,
      google: keys.google,
      openrouter: keys.openrouter,
    };

    // Helper to get provider instance and model ID for a given selection
    // Uses the new routing logic: direct key priority, OpenRouter fallback
    const getProviderForModel = (modelId: string) => {
      const route = getRouteForModel(modelId, keySet);
      if (!route) return null;

      if (route.source === "direct") {
        const instance = providerInstances[route.provider as keyof typeof providerInstances];
        if (!instance) return null;
        return {
          instance,
          modelId: route.modelId,
          source: "direct" as const,
        };
      }

      // OpenRouter route
      if (openrouterInstance) {
        return {
          instance: openrouterInstance,
          modelId: route.modelId,
          source: "openrouter" as const,
        };
      }

      return null;
    };

    // Validate all selected models have API keys (direct or via OpenRouter)
    for (const model of models) {
      const providerInfo = getProviderForModel(model.modelId);
      if (!providerInfo) {
        return new Response(
          JSON.stringify({
            error: `Missing API key for ${model.provider}. Add a ${model.provider} key or use OpenRouter.`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Determine evaluator provider using the new routing logic
    const evaluatorProvider = extractProvider(evaluatorModel) || "unknown";

    // Check if evaluator can be called (direct key or OpenRouter)
    const evaluatorProviderInfo = getProviderForModel(evaluatorModel);
    if (!evaluatorProviderInfo) {
      return new Response(
        JSON.stringify({
          error: `Missing API key for evaluator provider: ${evaluatorProvider}. Add a ${evaluatorProvider} key or use OpenRouter.`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get the actual key for the evaluator (for functions that still need raw key)
    // We've already validated that at least one of these exists via evaluatorProviderInfo
    // If the model is in OpenRouter format (has "/"), always use OpenRouter key
    // Otherwise, try direct key first, then OpenRouter
    const isOpenRouterModel = evaluatorModel.includes("/");
    const directKeyMap: Record<string, string | null> = {
      anthropic: keys.anthropic,
      openai: keys.openai,
      google: keys.google,
    };
    const evaluatorKey = isOpenRouterModel
      ? keys.openrouter!
      : (directKeyMap[evaluatorProvider] || keys.openrouter)!;

    // Create database record
    const conversationId = await createConsensusConversation(
      session.user.id,
      prompt,
      maxRounds,
      consensusThreshold
    );

    // Create streaming response
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let currentRound = 0;
        let previousResponses = new Map<string, string>();
        let previousEvaluation: ConsensusEvaluation | null = null;
        let isGoodEnough = false;
        let finalScore = 0;
        const allRoundsData: Array<{
          round: number;
          responses: Map<string, string>;
          evaluation: ConsensusEvaluation;
          searchData?: SearchData;
        }> = [];

        // Helper: safely send typed event, checking if request was aborted
        const safeEnqueue = (event: ConsensusEvent): boolean => {
          if (request.signal.aborted) {
            return false;
          }
          return sendEvent(encoder, controller, event);
        };

        try {
          // Check if already aborted before starting
          if (request.signal.aborted) {
            return;
          }

          // Send start event
          if (!safeEnqueue({
            type: "start",
            conversationId,
          })) return;

          // Multi-round loop with early termination
          while (currentRound < maxRounds && !isGoodEnough) {
            // Check if aborted
            if (request.signal.aborted) {
              return;
            }

            currentRound++;

            // Stream round status
            if (!safeEnqueue({
              type: "round-status",
              data: {
                roundNumber: currentRound,
                maxRounds,
                status:
                  currentRound === 1
                    ? "Initial responses"
                    : "Refining responses",
              },
            })) return;

            // Search logic: Round 1 or when model requested more info
            let searchData: SearchData | null = null;
            if (enableSearch && tavilyKey) {
              let shouldSearch = false;

              // Round 1: Check if question needs current info
              if (currentRound === 1) {
                shouldSearch = await shouldSearchWeb(prompt, evaluatorKey, evaluatorProvider, evaluatorModel);
              }
              // Subsequent rounds: Only if model requested
              else if (previousEvaluation?.needsMoreInfo && previousEvaluation?.suggestedSearchQuery) {
                shouldSearch = true;
              }

              if (shouldSearch) {
                try {
                  // Determine search query
                  const searchQuery = currentRound === 1
                    ? await generateSearchQuery(prompt, evaluatorKey, evaluatorProvider, evaluatorModel)
                    : previousEvaluation!.suggestedSearchQuery!;

                  // Stream search-start event
                  if (!safeEnqueue({
                    type: "search-start",
                    data: {
                      query: searchQuery,
                      round: currentRound,
                    },
                  })) return;

                  // Execute search
                  const results = await searchTavily(searchQuery, tavilyKey);

                  searchData = {
                    query: searchQuery,
                    results,
                    round: currentRound,
                    triggeredBy: currentRound === 1 ? 'user' : 'model',
                  };

                  // Stream search-complete event
                  if (!safeEnqueue({
                    type: "search-complete",
                    data: {
                      results,
                      round: currentRound,
                    },
                  })) return;
                } catch (error) {
                  // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
                  console.error(`[Round ${currentRound}] Search error:`, error);

                  // Stream search-error event (non-fatal)
                  safeEnqueue({
                    type: "search-error",
                    data: {
                      error: error instanceof Error ? error.message : 'Search failed',
                      round: currentRound,
                    },
                  });
                  // Continue without search results
                }
              }
            }

            // Generate responses from all selected models
            const roundResponses = await generateRoundResponses({
              prompt: currentRound === 1 ? prompt : null,
              originalPrompt: prompt,
              previousResponses: currentRound > 1 ? previousResponses : null,
              selectedModels: models,
              providerInstances,
              openrouterInstance,
              controller,
              encoder,
              round: currentRound,
              signal: request.signal,
              searchData: searchData || undefined,
            });

            // Check if aborted after generating responses
            if (request.signal.aborted) {
              return;
            }

            // Check if any model failed - abort immediately
            const failedModels = models.filter(
              (m) => roundResponses.get(m.id)?.startsWith("[Error:")
            );

            if (failedModels.length > 0) {
              // Any model failure aborts the consensus process
              const failedNames = failedModels.map((m) => m.label).join(", ");
              safeEnqueue({
                type: "error",
                data: {
                  message: failedModels.length === models.length
                    ? "All models failed to respond. Please try different models or check your API keys."
                    : `Consensus cancelled: ${failedNames} failed. Please try different models or check your API keys.`,
                  round: currentRound,
                },
              });
              return;
            }

            // Send evaluation start event
            if (!safeEnqueue({
              type: "evaluation-start",
              round: currentRound,
            })) return;

            // Evaluate consensus with error handling
            let evaluation;
            try {
              console.log(`[Round ${currentRound}] Evaluating consensus with ${evaluatorProvider}:${evaluatorModel}`);

              evaluation = await evaluateConsensusWithStream(
                roundResponses,
                models,
                consensusThreshold,
                evaluatorKey,
                evaluatorProvider,
                evaluatorModel,
                currentRound,
                (partial) => {
                  // Stream partial evaluation updates to frontend
                  safeEnqueue({
                    type: "evaluation",
                    data: partial,
                    round: currentRound,
                  });
                },
                enableSearch
              );

              console.log(`[Round ${currentRound}] Evaluation complete - Score: ${evaluation.score}%`);

              // Send evaluation complete event
              if (!safeEnqueue({
                type: "evaluation-complete",
                round: currentRound,
              })) return;
            } catch (error) {
              // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
              console.error(`[Round ${currentRound}] Evaluation failed:`, error);

              // Parse the error to give user-friendly message
              const parsedError = parseAIError(error);
              let errorMessage = "Failed to evaluate consensus. Please try again.";

              if (parsedError.type === 'rate-limit') {
                errorMessage = `Evaluator model is rate-limited. Please try a different evaluator model or wait a moment.`;
              } else if (parsedError.type === 'openrouter-privacy') {
                errorMessage = `Evaluator model requires OpenRouter privacy settings update.`;
              }

              safeEnqueue({
                type: "error",
                data: {
                  message: errorMessage,
                  round: currentRound,
                },
              });

              return; // Stop processing - don't throw, just end gracefully
            }

            finalScore = evaluation.score;
            // Enforce threshold - only the score matters, not LLM's opinion
            isGoodEnough = evaluation.score >= consensusThreshold;

            console.log(`[Round ${currentRound}] Consensus ${isGoodEnough ? 'reached' : 'not reached'} (${evaluation.score}% vs ${consensusThreshold}% threshold)`);

            previousResponses = roundResponses;
            previousEvaluation = evaluation;

            // Store round data for progression summary
            allRoundsData.push({
              round: currentRound,
              responses: new Map(roundResponses),
              evaluation: evaluation,
              searchData: searchData || undefined,
            });

            // Save round to database
            await saveConsensusRound(conversationId, {
              roundNumber: currentRound,
              modelResponses: Object.fromEntries(roundResponses),
              evaluation: {
                reasoning: evaluation.reasoning,
                keyDifferences: evaluation.keyDifferences,
                score: evaluation.score,
              },
              refinementPrompts:
                !isGoodEnough && currentRound < maxRounds
                  ? buildRefinementPromptsForAllModels(
                      prompt,
                      roundResponses,
                      models,
                      currentRound + 1
                    )
                  : undefined,
            });

            // Stream refinement prompts if not done
            if (!isGoodEnough && currentRound < maxRounds) {
              const refinementPrompts = buildRefinementPromptsForAllModels(
                prompt,
                roundResponses,
                models,
                currentRound + 1
              );

              if (!safeEnqueue({
                type: "refinement-prompts",
                data: refinementPrompts,
                round: currentRound,
              })) return;
            }
          }

          // Check if aborted before synthesis
          if (request.signal.aborted) return;

          // Generate final synthesis
          if (!safeEnqueue({
            type: "synthesis-start",
          })) return;

          console.log(`[Synthesis] Generating final consensus with ${evaluatorProvider}:${evaluatorModel}`);

          let finalSynthesis = "";
          await streamFinalSynthesis({
            originalPrompt: prompt,
            finalResponses: previousResponses,
            selectedModels: models,
            providerInstances,
            openrouterInstance,
            evaluatorProvider,
            evaluatorModel,
            onChunk: (chunk) => {
              finalSynthesis += chunk;
              safeEnqueue({
                type: "synthesis-chunk",
                content: chunk,
              });
            },
          });

          console.log(`[Synthesis] Complete`);

          // Check if aborted before progression summary
          if (request.signal.aborted) return;

          // Generate progression summary (only if multiple rounds)
          if (allRoundsData.length > 1) {
            if (!safeEnqueue({
              type: "progression-summary-start",
            })) return;

            await streamProgressionSummary({
              originalPrompt: prompt,
              roundsData: allRoundsData,
              selectedModels: models,
              providerInstances,
              openrouterInstance,
              evaluatorProvider,
              evaluatorModel,
              onChunk: (chunk) => {
                safeEnqueue({
                  type: "progression-summary-chunk",
                  content: chunk,
                });
              },
            });
          }

          // Check if aborted before final updates
          if (request.signal.aborted) return;

          // Update database with final result
          await updateConversationResult(
            conversationId,
            finalSynthesis,
            finalScore,
            currentRound
          );

          // Send final responses
          if (!safeEnqueue({
            type: "final-responses",
            data: Object.fromEntries(previousResponses),
          })) return;

          // Send complete event
          safeEnqueue({
            type: "complete",
          });
        } catch (error: any) {
          console.error("Error in consensus workflow:", error);
          safeEnqueue({
            type: "error",
            data: {
              message: error.message || "An error occurred",
            },
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Error in consensus route", error);
    return new Response("Internal server error", { status: 500 });
  }
}

/**
 * Generate responses from all selected models (2-3), stream and buffer
 */
async function generateRoundResponses(opts: {
  prompt: string | null;
  originalPrompt: string;
  previousResponses: Map<string, string> | null;
  selectedModels: ModelSelection[];
  providerInstances: Record<string, any>;
  openrouterInstance: any;
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  round: number;
  signal: AbortSignal;
  searchData?: SearchData;
}): Promise<Map<string, string>> {
  const responses = new Map<string, string>();

  // Create internal abort controller that triggers when any model fails
  const internalAbortController = new AbortController();

  // Helper: safely send typed event, checking abort signals
  const safeEnqueue = (event: ConsensusEvent): boolean => {
    if (opts.signal.aborted || internalAbortController.signal.aborted) {
      return false;
    }
    return sendEvent(opts.encoder, opts.controller, event);
  };

  // Helper: stream and buffer single model response with timeout
  async function streamAndBuffer(modelSelection: ModelSelection) {
    // Direct providers we support with API keys
    const directProviders = ["anthropic", "openai", "google"];
    const isDirectProvider = directProviders.includes(modelSelection.provider);
    // Check if model ID is in OpenRouter format (contains "/")
    const isOpenRouterModel = modelSelection.modelId.includes("/");

    // Determine which provider to use
    // Use OpenRouter if: model ID is OpenRouter format OR provider isn't direct
    // Use direct only if: provider is direct AND model ID isn't OpenRouter format AND we have the key
    let provider = null;
    let modelIdToUse = modelSelection.modelId;
    let source = "direct";

    if (!isOpenRouterModel && isDirectProvider && opts.providerInstances[modelSelection.provider]) {
      // Direct provider with non-OpenRouter model ID
      provider = opts.providerInstances[modelSelection.provider];
      source = "direct";
    } else if (opts.openrouterInstance) {
      // Use OpenRouter
      provider = opts.openrouterInstance;
      modelIdToUse = modelSelection.modelId; // Already in OpenRouter format or will be mapped
      source = "openrouter";
    }

    if (!provider) {
      console.error(`Provider not found for ${modelSelection.id}`);
      responses.set(modelSelection.id, `[Error: Provider not configured for ${modelSelection.label}]`);
      return;
    }

    console.log(`[Model Call] Round ${opts.round}: Calling ${modelSelection.provider}:${modelIdToUse} via ${source} (${modelSelection.label})`);

    try {

      // Build prompt (initial or refinement)
      let promptText = opts.prompt
        ? opts.prompt // Round 1
        : buildRefinementPrompt(
            // Round 2+
            opts.originalPrompt,
            modelSelection.id,
            modelSelection.label,
            opts.previousResponses!.get(modelSelection.id) || "",
            opts.previousResponses!,
            opts.selectedModels,
            opts.round
          );

      // Inject search context if available
      if (opts.searchData) {
        promptText = buildPromptWithSearchContext(promptText, opts.searchData.results);
      }

      // Direct providers are callable functions, OpenRouter uses .chat()
      const model = source === "openrouter"
        ? provider.chat(modelIdToUse)
        : provider(modelIdToUse);

      let apiError: Error | null = null; // Capture the real API error from onError callback
      const result = streamText({
        model,
        prompt: promptText,
        abortSignal: internalAbortController.signal, // Use internal abort signal
        onError: ({ error }) => {
          // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
          console.error(`[Model ${modelSelection.modelId}] onError callback:`, error);
          apiError = error instanceof Error ? error : new Error(String(error));
        },
      });

      // Stream to frontend and buffer with timeout
      let fullResponse = "";
      const timeoutMs = 180000; // 3 minutes - increased to accommodate slower models
      const startTime = Date.now();
      let streamError: Error | null = null;

      try {
        for await (const chunk of result.textStream) {
          // Check if aborted (either by user or by internal failure)
          if (opts.signal.aborted || internalAbortController.signal.aborted) {
            return;
          }

          // Check timeout
          if (Date.now() - startTime > timeoutMs) {
            throw new Error(`Model ${modelSelection.label} timeout after 3 minutes`);
          }

          fullResponse += chunk;

          if (!safeEnqueue({
            type: "model-response",
            data: {
              modelId: modelSelection.id,
              modelLabel: modelSelection.label,
              content: fullResponse,
              round: opts.round,
            },
          })) {
            // Stream closed, stop processing
            return;
          }
        }
      } catch (iterError) {
        // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
        console.error(`[Model ${modelSelection.modelId}] Stream iteration error:`, iterError);
        streamError = iterError instanceof Error ? iterError : new Error(String(iterError));
      }

      // Also await the text promise to catch any errors that didn't surface in the stream
      try {
        await result.text;
      } catch (textError) {
        console.error(`[Model ${modelSelection.modelId}] result.text error:`, textError);
        if (!streamError) {
          streamError = textError instanceof Error ? textError : new Error(String(textError));
        }
      }

      // Prefer the API error (from onError callback) as it has the real error message
      // Fall back to stream error if no API error was captured
      if (apiError || streamError) {
        throw apiError || streamError;
      }

      // Signal that this model has finished streaming
      safeEnqueue({
        type: "model-complete",
        data: {
          modelId: modelSelection.id,
          round: opts.round,
        },
      });

      // Buffer complete response for evaluation
      responses.set(modelSelection.id, fullResponse);
    } catch (error) {
      // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
      console.error(`[Model ${modelSelection.modelId}] Failed:`, error);

      // Parse error using helper that traverses nested AI SDK error structure
      const parsedError = parseAIError(error);

      // Don't send errors or trigger aborts for models that were aborted by another failure
      const wasAbortedByFailure = internalAbortController.signal.aborted;

      // For the actual failed model (not ones we aborted), send error event and trigger abort
      if (!opts.signal.aborted && !wasAbortedByFailure) {
        // Send error event to client BEFORE we trigger abort
        safeEnqueue({
          type: "model-error",
          data: {
            modelId: modelSelection.id,
            modelLabel: modelSelection.label,
            error: parsedError.message,
            errorType: parsedError.type,
            round: opts.round,
          },
        });

        // Now abort all other models
        internalAbortController.abort();
      }

      // Set placeholder response so we know which model failed
      responses.set(modelSelection.id, `[Error: ${modelSelection.label} did not respond]`);
    }
  }

  // Run all selected models in parallel (2 or 3) with graceful failure handling
  await Promise.allSettled(opts.selectedModels.map((model) => streamAndBuffer(model)));

  return responses;
}

/**
 * Build refinement prompts for all models
 */
function buildRefinementPromptsForAllModels(
  originalPrompt: string,
  responses: Map<string, string>,
  selectedModels: ModelSelection[],
  nextRound: number
): Record<string, string> {
  const prompts: Record<string, string> = {};

  for (const model of selectedModels) {
    prompts[model.id] = buildRefinementPrompt(
      originalPrompt,
      model.id,
      model.label,
      responses.get(model.id)!,
      responses,
      selectedModels,
      nextRound
    );
  }

  return prompts;
}

/**
 * Generate and stream final synthesis
 */
async function streamFinalSynthesis(opts: {
  originalPrompt: string;
  finalResponses: Map<string, string>;
  selectedModels: ModelSelection[];
  providerInstances: Record<string, any>;
  openrouterInstance: any;
  evaluatorProvider: string;
  evaluatorModel: string;
  onChunk: (chunk: string) => void;
}): Promise<void> {
  // Determine provider for synthesis using same priority as main routing:
  // 1. If model ID is OpenRouter format (has "/"), use OpenRouter
  // 2. If direct provider instance available, use direct
  // 3. Fallback to OpenRouter with constructed model ID
  const isOpenRouterModel = opts.evaluatorModel.includes("/");
  let thinkingProvider;
  let thinkingModel = opts.evaluatorModel;
  let useOpenRouter = false;

  if (isOpenRouterModel && opts.openrouterInstance) {
    // OpenRouter model - route through OpenRouter
    thinkingProvider = opts.openrouterInstance;
    useOpenRouter = true;
  } else if (opts.providerInstances[opts.evaluatorProvider]) {
    // Direct provider model with available key
    thinkingProvider = opts.providerInstances[opts.evaluatorProvider];
  } else if (opts.openrouterInstance) {
    // Fallback to OpenRouter - construct OpenRouter format if needed
    thinkingProvider = opts.openrouterInstance;
    // If not already OpenRouter format, construct it: provider/model
    thinkingModel = isOpenRouterModel
      ? opts.evaluatorModel
      : `${opts.evaluatorProvider}/${opts.evaluatorModel}`;
    useOpenRouter = true;
  }

  // Build synthesis prompt
  const responsesText = opts.selectedModels
    .map((m) => {
      return `${m.label}:\n${opts.finalResponses.get(m.id)}`;
    })
    .join("\n\n---\n\n");

  const synthesisPrompt = `You are synthesizing a consensus response from ${opts.selectedModels.length} AI models.

Original Question: ${opts.originalPrompt}

Final Responses:
---
${responsesText}

Create a single, unified response that:
1. Incorporates the key insights from all models
2. Presents a balanced, consensus view
3. Acknowledges any remaining differences if they exist
4. Provides a clear, coherent answer
5. Does NOT use any emojis or unicode symbols - use plain text only

Generate the consensus response:`;

  // Direct providers are callable functions, OpenRouter uses .chat()
  const model = useOpenRouter
    ? thinkingProvider.chat(thinkingModel)
    : thinkingProvider(thinkingModel);

  const synthesisResult = streamText({
    model,
    prompt: synthesisPrompt,
  });

  // Stream chunks
  for await (const chunk of synthesisResult.textStream) {
    opts.onChunk(chunk);
  }
}

/**
 * Generate and stream progression summary
 */
async function streamProgressionSummary(opts: {
  originalPrompt: string;
  roundsData: Array<{
    round: number;
    responses: Map<string, string>;
    evaluation: ConsensusEvaluation;
  }>;
  selectedModels: ModelSelection[];
  providerInstances: Record<string, any>;
  openrouterInstance: any;
  evaluatorProvider: string;
  evaluatorModel: string;
  onChunk: (chunk: string) => void;
}): Promise<void> {
  // Determine provider for progression summary using same priority as main routing:
  // 1. If model ID is OpenRouter format (has "/"), use OpenRouter
  // 2. If direct provider instance available, use direct
  // 3. Fallback to OpenRouter with constructed model ID
  const isOpenRouterModel = opts.evaluatorModel.includes("/");
  let thinkingProvider;
  let thinkingModel = opts.evaluatorModel;
  let useOpenRouter = false;

  if (isOpenRouterModel && opts.openrouterInstance) {
    // OpenRouter model - route through OpenRouter
    thinkingProvider = opts.openrouterInstance;
    useOpenRouter = true;
  } else if (opts.providerInstances[opts.evaluatorProvider]) {
    // Direct provider model with available key
    thinkingProvider = opts.providerInstances[opts.evaluatorProvider];
  } else if (opts.openrouterInstance) {
    // Fallback to OpenRouter - construct OpenRouter format if needed
    thinkingProvider = opts.openrouterInstance;
    // If not already OpenRouter format, construct it: provider/model
    thinkingModel = isOpenRouterModel
      ? opts.evaluatorModel
      : `${opts.evaluatorProvider}/${opts.evaluatorModel}`;
    useOpenRouter = true;
  }

  // Maximum length for response excerpts in progression summary
  const RESPONSE_EXCERPT_LENGTH = 300;

  // Build progression summary prompt
  // Helper to format round data for the prompt
  const formatRoundData = (roundData: typeof opts.roundsData[0]): string => {
    const responsesText = opts.selectedModels
      .map((m) => {
        const response = roundData.responses.get(m.id) || "";
        const excerpt = response.length > RESPONSE_EXCERPT_LENGTH 
          ? `${response.substring(0, RESPONSE_EXCERPT_LENGTH)}...`
          : response;
        return `  - **${m.label}**: ${excerpt}`;
      })
      .join("\n");

    return `**Round ${roundData.round}**:
- Consensus Score: ${roundData.evaluation.score}%
- Summary: ${roundData.evaluation.summary}
- Areas of Agreement: ${roundData.evaluation.areasOfAgreement?.join(", ") || "N/A"}
- Key Differences: ${roundData.evaluation.keyDifferences?.join(", ") || "N/A"}

Model Responses (excerpts):
${responsesText}`;
  };

  const roundsSummaryText = opts.roundsData
    .map(formatRoundData)
    .join("\n\n---\n\n");

  const progressionPrompt = `You are analyzing how AI models evolved their perspectives across multiple rounds of consensus-building.

Original Question: ${opts.originalPrompt}

Selected Models: ${opts.selectedModels.map(m => m.label).join(", ")}

Rounds Data:
---
${roundsSummaryText}

Create a compelling narrative summary that describes how the consensus evolved across these ${opts.roundsData.length} rounds. Focus on:

1. **How positions changed**: Did models significantly shift their stances, or did they largely maintain their initial positions?
2. **Convergence patterns**: What areas saw the most movement toward agreement? What remained contentious?
3. **Key turning points**: Were there specific insights or refinements in certain rounds that helped bridge differences?
4. **Individual model behaviors**: Did any model play a unique role (e.g., one model consistently bridging gaps, another holding firm to a specific perspective)?
5. **Final outcome**: How does the progression explain the final consensus (or lack thereof)?

**Important formatting constraints:**
- Write in an engaging, conversational tone (similar to the round summaries' vibe)
- Use at most 2 sentences per round when discussing individual rounds
- If combining multiple rounds, you may use up to 3 sentences
- Keep it concise but insightful (2-4 paragraphs total)
- Use specific examples from the rounds
- **Use markdown formatting** to make it visually engaging:
  - Use **bold** for model names and key terms
  - Use *italics* for emphasis on important shifts or insights
  - Consider using bullet points or numbered lists where appropriate
- **Do NOT use any emojis or unicode symbols** - use plain text and markdown only

Generate the progression summary:`;

  try {
    // Direct providers are callable functions, OpenRouter uses .chat()
    const model = useOpenRouter
      ? thinkingProvider.chat(thinkingModel)
      : thinkingProvider(thinkingModel);

    const progressionResult = streamText({
      model,
      prompt: progressionPrompt,
    });

    // Stream chunks
    for await (const chunk of progressionResult.textStream) {
      opts.onChunk(chunk);
    }
  } catch (error) {
    console.error('[Progression Summary] Failed to generate:', error);
    // Provide a fallback message if generation fails
    opts.onChunk(
      `Unable to generate progression summary at this time. The consensus evolved across ${opts.roundsData.length} rounds.`
    );
  }
}
