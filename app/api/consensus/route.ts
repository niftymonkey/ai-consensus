import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { evaluateConsensusWithStream } from "@/lib/consensus-evaluator";
import { buildRefinementPrompt } from "@/lib/consensus-prompts";
import type { ModelSelection, ConsensusEvaluation } from "@/lib/types";
import {
  createConsensusConversation,
  saveConsensusRound,
  updateConversationResult,
} from "@/lib/consensus-db";

export const maxDuration = 300; // 5 minutes for multiple rounds
export const runtime = "nodejs";

interface ConsensusRequest {
  prompt: string;
  models: [ModelSelection, ModelSelection] | [ModelSelection, ModelSelection, ModelSelection];
  maxRounds?: number;
  consensusThreshold?: number;
  evaluatorModel?: string;
}

/**
 * POST /api/consensus - Multi-round consensus workflow
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const {
      prompt,
      models,
      maxRounds = 3,
      consensusThreshold = 80,
      evaluatorModel = "claude-3-7-sonnet-20250219",
    }: ConsensusRequest = await request.json();

    // Validate prompt
    if (!prompt || typeof prompt !== "string") {
      return new Response("Missing or invalid prompt", { status: 400 });
    }

    // Validate models array (must be 2-3 models)
    if (!Array.isArray(models) || models.length < 2 || models.length > 3) {
      return new Response(
        JSON.stringify({ error: "Must select 2-3 models" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Get user's API keys
    const keys = await getApiKeys(session.user.id);

    // Log request
    console.log('=== Consensus API Request ===');
    console.log('Models:', models.map(m => `${m.provider}:${m.modelId}`));
    console.log('Evaluator:', evaluatorModel);
    console.log('Max rounds:', maxRounds);
    console.log('Threshold:', consensusThreshold);

    // Create provider instances based on available keys
    const providerInstances = {
      anthropic: keys.anthropic
        ? createAnthropic({ apiKey: keys.anthropic })
        : null,
      openai: keys.openai ? createOpenAI({ apiKey: keys.openai }) : null,
      google: keys.google
        ? createGoogleGenerativeAI({ apiKey: keys.google })
        : null,
    };

    // Validate all selected models have API keys
    for (const model of models) {
      if (!providerInstances[model.provider]) {
        return new Response(
          JSON.stringify({
            error: `Missing API key for ${model.provider}`,
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    // Determine evaluator provider based on selected model
    const evaluatorProvider: "anthropic" | "openai" | "google" =
      evaluatorModel.startsWith("claude")
        ? "anthropic"
        : evaluatorModel.startsWith("gemini")
          ? "google"
          : "openai";
    const evaluatorKey = keys[evaluatorProvider];

    if (!evaluatorKey) {
      return new Response(
        JSON.stringify({
          error: `Missing API key for evaluator provider: ${evaluatorProvider}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

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
        let isGoodEnough = false;
        let finalScore = 0;
        const allRoundsData: Array<{
          round: number;
          responses: Map<string, string>;
          evaluation: ConsensusEvaluation;
        }> = [];

        // Helper: safely enqueue data, checking if request was aborted
        const safeEnqueue = (data: Uint8Array): boolean => {
          if (request.signal.aborted) {
            return false;
          }
          try {
            controller.enqueue(data);
            return true;
          } catch (error) {
            // Controller may be closed if client disconnected
            console.log("Stream controller closed:", error instanceof Error ? error.message : 'Unknown error');
            return false;
          }
        };

        try {
          // Check if already aborted before starting
          if (request.signal.aborted) {
            console.log("Request aborted before processing started");
            return;
          }

          // Send start event
          if (!safeEnqueue(
            encoder.encode(
              JSON.stringify({
                type: "start",
                conversationId,
              }) + "\n"
            )
          )) return;

          // Multi-round loop with early termination
          while (currentRound < maxRounds && !isGoodEnough) {
            // Check if aborted
            if (request.signal.aborted) {
              console.log("Request aborted during round loop");
              return;
            }

            currentRound++;

            // Stream round status
            if (!safeEnqueue(
              encoder.encode(
                JSON.stringify({
                  type: "round-status",
                  data: {
                    roundNumber: currentRound,
                    maxRounds,
                    status:
                      currentRound === 1
                        ? "Initial responses"
                        : "Refining responses",
                  },
                }) + "\n"
              )
            )) return;

            // Generate responses from all selected models
            const roundResponses = await generateRoundResponses({
              prompt: currentRound === 1 ? prompt : null,
              originalPrompt: prompt,
              previousResponses: currentRound > 1 ? previousResponses : null,
              selectedModels: models,
              providerInstances,
              controller,
              encoder,
              round: currentRound,
              signal: request.signal,
            });

            // Check if aborted after generating responses
            if (request.signal.aborted) {
              console.log("Request aborted after generating responses");
              return;
            }

            // Send evaluation start event
            if (!safeEnqueue(
              encoder.encode(
                JSON.stringify({
                  type: "evaluation-start",
                  round: currentRound,
                }) + "\n"
              )
            )) return;

            // Evaluate consensus with error handling
            let evaluation;
            try {
              console.log(`[Round ${currentRound}] Starting consensus evaluation with ${evaluatorProvider}:${evaluatorModel}`);

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
                  safeEnqueue(
                    encoder.encode(
                      JSON.stringify({
                        type: "evaluation",
                        data: partial,
                        round: currentRound,
                      }) + "\n"
                    )
                  );
                }
              );

              console.log(`[Round ${currentRound}] Consensus evaluation received - Score: ${evaluation.score}%, isGoodEnough: ${evaluation.isGoodEnough}`);

              // Send evaluation complete event
              if (!safeEnqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "evaluation-complete",
                    round: currentRound,
                  }) + "\n"
                )
              )) return;
            } catch (error) {
              console.error(`[Round ${currentRound}] Evaluation failed:`, error);

              safeEnqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "error",
                    data: {
                      message: "Failed to evaluate consensus. Please try again.",
                      round: currentRound,
                      details: error instanceof Error ? error.message : 'Unknown error'
                    },
                  }) + "\n"
                )
              );

              throw error; // Re-throw to hit outer catch
            }

            finalScore = evaluation.score;
            // Fallback: Enforce isGoodEnough logic in case LLM makes a mistake
            isGoodEnough = evaluation.isGoodEnough || evaluation.score >= consensusThreshold;

            // Debug logging
            console.log(`[Round ${currentRound}] Score: ${evaluation.score}, Threshold: ${consensusThreshold}, LLM isGoodEnough: ${evaluation.isGoodEnough}, Final isGoodEnough: ${isGoodEnough}`);

            previousResponses = roundResponses;

            // Store round data for progression summary
            allRoundsData.push({
              round: currentRound,
              responses: new Map(roundResponses),
              evaluation: evaluation,
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

              if (!safeEnqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "refinement-prompts",
                    data: refinementPrompts,
                    round: currentRound,
                  }) + "\n"
                )
              )) return;
            }
          }

          // Check if aborted before synthesis
          if (request.signal.aborted) {
            console.log("Request aborted before synthesis");
            return;
          }

          // Generate final synthesis
          if (!safeEnqueue(
            encoder.encode(
              JSON.stringify({
                type: "synthesis-start",
              }) + "\n"
            )
          )) return;

          console.log(`[Synthesis] Starting final synthesis with ${evaluatorProvider}:${evaluatorModel}`);

          let finalSynthesis = "";
          await streamFinalSynthesis({
            originalPrompt: prompt,
            finalResponses: previousResponses,
            selectedModels: models,
            providerInstances,
            evaluatorProvider,
            evaluatorModel,
            onChunk: (chunk) => {
              finalSynthesis += chunk;
              safeEnqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "synthesis-chunk",
                    content: chunk,
                  }) + "\n"
                )
              );
            },
          });

          console.log(`[Synthesis] Final synthesis received (${finalSynthesis.length} chars)`);

          // Check if aborted before progression summary
          if (request.signal.aborted) {
            console.log("Request aborted before progression summary");
            return;
          }

          // Generate progression summary (only if multiple rounds)
          if (allRoundsData.length > 1) {
            if (!safeEnqueue(
              encoder.encode(
                JSON.stringify({
                  type: "progression-summary-start",
                }) + "\n"
              )
            )) return;

            console.log(`[Progression Summary] Starting progression summary generation`);

            await streamProgressionSummary({
              originalPrompt: prompt,
              roundsData: allRoundsData,
              selectedModels: models,
              providerInstances,
              evaluatorProvider,
              evaluatorModel,
              onChunk: (chunk) => {
                safeEnqueue(
                  encoder.encode(
                    JSON.stringify({
                      type: "progression-summary-chunk",
                      content: chunk,
                    }) + "\n"
                  )
                );
              },
            });

            console.log(`[Progression Summary] Complete`);
          }

          // Check if aborted before final updates
          if (request.signal.aborted) {
            console.log("Request aborted before final updates");
            return;
          }

          // Update database with final result
          await updateConversationResult(
            conversationId,
            finalSynthesis,
            finalScore,
            currentRound
          );

          // Send final responses
          if (!safeEnqueue(
            encoder.encode(
              JSON.stringify({
                type: "final-responses",
                data: Object.fromEntries(previousResponses),
              }) + "\n"
            )
          )) return;

          // Send complete event
          safeEnqueue(
            encoder.encode(
              JSON.stringify({
                type: "complete",
              }) + "\n"
            )
          );
        } catch (error: any) {
          console.error("Error in consensus workflow:", error);
          safeEnqueue(
            encoder.encode(
              JSON.stringify({
                type: "error",
                error: error.message || "An error occurred",
              }) + "\n"
            )
          );
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
    console.error("Error in consensus route:", error);
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
  controller: ReadableStreamDefaultController;
  encoder: TextEncoder;
  round: number;
  signal: AbortSignal;
}): Promise<Map<string, string>> {
  const responses = new Map<string, string>();

  // Helper: safely enqueue, checking abort signal
  const safeEnqueue = (data: Uint8Array): boolean => {
    if (opts.signal.aborted) {
      return false;
    }
    try {
      opts.controller.enqueue(data);
      return true;
    } catch (error) {
      console.log("Stream controller closed in generateRoundResponses:", error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  };

  // Helper: stream and buffer single model response with timeout
  async function streamAndBuffer(modelSelection: ModelSelection) {
    const provider = opts.providerInstances[modelSelection.provider];
    if (!provider) {
      console.error(`Provider not found for ${modelSelection.id}`);
      responses.set(modelSelection.id, `[Error: Provider not configured for ${modelSelection.label}]`);
      return;
    }

    console.log(`[Model Call] Round ${opts.round}: Calling ${modelSelection.provider}:${modelSelection.modelId} (${modelSelection.label})`);

    try {
      // Build prompt (initial or refinement)
      const promptText = opts.prompt
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

      const result = streamText({
        model: provider(modelSelection.modelId),
        prompt: promptText,
      });

      // Stream to frontend and buffer with timeout
      let fullResponse = "";
      const timeoutMs = 180000; // 3 minutes - increased to accommodate slower models
      const startTime = Date.now();

      for await (const chunk of result.textStream) {
        // Check if aborted
        if (opts.signal.aborted) {
          console.log(`Model ${modelSelection.id} streaming aborted`);
          return;
        }

        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
          throw new Error(`Model ${modelSelection.label} timeout after 3 minutes`);
        }

        fullResponse += chunk;

        if (!safeEnqueue(
          opts.encoder.encode(
            JSON.stringify({
              type: "model-response",
              data: {
                modelId: modelSelection.id,
                modelLabel: modelSelection.label,
                content: fullResponse,
                round: opts.round,
              },
            }) + "\n"
          )
        )) {
          // Stream closed, stop processing
          return;
        }
      }

      // Buffer complete response for evaluation
      responses.set(modelSelection.id, fullResponse);
    } catch (error) {
      console.error(`Model ${modelSelection.id} failed:`, error);

      // Send error event to client (only if not aborted)
      if (!opts.signal.aborted) {
        safeEnqueue(
          opts.encoder.encode(
            JSON.stringify({
              type: "model-error",
              data: {
                modelId: modelSelection.id,
                modelLabel: modelSelection.label,
                error: error instanceof Error ? error.message : 'Unknown error',
                round: opts.round,
              },
            }) + "\n"
          )
        );
      }

      // Set placeholder response so consensus can continue with remaining models
      responses.set(modelSelection.id, `[Error: ${modelSelection.label} did not respond]`);
    }
  }

  // Run all selected models in parallel (2 or 3) with graceful failure handling
  await Promise.allSettled(opts.selectedModels.map((model) => streamAndBuffer(model)));

  console.log(`[Round ${opts.round}] All model responses received`);
  console.log(`[Round ${opts.round}] Response lengths:`, Object.fromEntries(
    Array.from(responses.entries()).map(([id, text]) => [id, `${text.length} chars`])
  ));

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
  evaluatorProvider: "anthropic" | "openai" | "google";
  evaluatorModel: string;
  onChunk: (chunk: string) => void;
}): Promise<void> {
  // Use evaluator provider for synthesis
  const thinkingProvider = opts.providerInstances[opts.evaluatorProvider];
  const thinkingModel = opts.evaluatorModel;

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

Generate the consensus response:`;

  const synthesisResult = streamText({
    model: thinkingProvider(thinkingModel),
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
  evaluatorProvider: "anthropic" | "openai" | "google";
  evaluatorModel: string;
  onChunk: (chunk: string) => void;
}): Promise<void> {
  // Use evaluator provider for progression summary
  const thinkingProvider = opts.providerInstances[opts.evaluatorProvider];
  const thinkingModel = opts.evaluatorModel;

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

Generate the progression summary:`;

  try {
    const progressionResult = streamText({
      model: thinkingProvider(thinkingModel),
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
