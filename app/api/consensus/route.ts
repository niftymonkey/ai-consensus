import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { streamText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { evaluateConsensusWithStream } from "@/lib/consensus-evaluator";
import { buildRefinementPrompt } from "@/lib/consensus-prompts";
import type { ModelSelection } from "@/lib/types";
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

    // Determine evaluator (prefer Claude, fallback to OpenAI)
    const evaluatorProvider: "anthropic" | "openai" = keys.anthropic
      ? "anthropic"
      : "openai";
    const evaluatorKey = keys.anthropic || keys.openai;

    if (!evaluatorKey) {
      return new Response(
        JSON.stringify({
          error: "Need at least one API key (Anthropic or OpenAI) for evaluation",
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

        try {
          // Send start event
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "start",
                conversationId,
              }) + "\n"
            )
          );

          // Multi-round loop with early termination
          while (currentRound < maxRounds && !isGoodEnough) {
            currentRound++;

            // Stream round status
            controller.enqueue(
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
            );

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
            });

            // Evaluate consensus
            const evaluation = await evaluateConsensusWithStream(
              roundResponses,
              models,
              consensusThreshold,
              evaluatorKey,
              evaluatorProvider,
              currentRound,
              (partial) => {
                // Stream partial evaluation updates to frontend
                controller.enqueue(
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

            finalScore = evaluation.score;
            isGoodEnough = evaluation.isGoodEnough;
            previousResponses = roundResponses;

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

              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "refinement-prompts",
                    data: refinementPrompts,
                    round: currentRound,
                  }) + "\n"
                )
              );
            }
          }

          // Generate final synthesis
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "synthesis-start",
              }) + "\n"
            )
          );

          let finalSynthesis = "";
          await streamFinalSynthesis({
            originalPrompt: prompt,
            finalResponses: previousResponses,
            selectedModels: models,
            providerInstances,
            evaluatorProvider,
            onChunk: (chunk) => {
              finalSynthesis += chunk;
              controller.enqueue(
                encoder.encode(
                  JSON.stringify({
                    type: "synthesis-chunk",
                    content: chunk,
                  }) + "\n"
                )
              );
            },
          });

          // Update database with final result
          await updateConversationResult(
            conversationId,
            finalSynthesis,
            finalScore,
            currentRound
          );

          // Send final responses
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "final-responses",
                data: Object.fromEntries(previousResponses),
              }) + "\n"
            )
          );

          // Send complete event
          controller.enqueue(
            encoder.encode(
              JSON.stringify({
                type: "complete",
              }) + "\n"
            )
          );
        } catch (error: any) {
          console.error("Error in consensus workflow:", error);
          controller.enqueue(
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
}): Promise<Map<string, string>> {
  const responses = new Map<string, string>();

  // Helper: stream and buffer single model response
  async function streamAndBuffer(modelSelection: ModelSelection) {
    const provider = opts.providerInstances[modelSelection.provider];
    if (!provider) return;

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

    // Stream to frontend and buffer
    let fullResponse = "";

    for await (const chunk of result.textStream) {
      fullResponse += chunk;

      opts.controller.enqueue(
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
      );
    }

    // Buffer complete response for evaluation
    responses.set(modelSelection.id, fullResponse);
  }

  // Run all selected models in parallel (2 or 3)
  await Promise.all(opts.selectedModels.map((model) => streamAndBuffer(model)));

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
  evaluatorProvider: "anthropic" | "openai";
  onChunk: (chunk: string) => void;
}): Promise<void> {
  // Use evaluator provider for synthesis
  const thinkingProvider = opts.providerInstances[opts.evaluatorProvider];
  const thinkingModel =
    opts.evaluatorProvider === "anthropic"
      ? "claude-3-7-sonnet-20250219"
      : "gpt-4o";

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
