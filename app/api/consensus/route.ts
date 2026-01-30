import { NextRequest } from "next/server";
import { start } from "workflow/api";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import type { ModelSelection } from "@/lib/types";
import { createConsensusConversation } from "@/lib/consensus-db";
import { getRouteForModel, resolveProvider, type KeySet } from "@/lib/model-routing";
import { logger } from "@/lib/logger";
import { captureServerException } from "@/lib/posthog-server";
import { z } from "zod";
import { getPreviewUserIdentifier } from "@/lib/request-utils";
import { getPreviewStatus } from "@/lib/preview-db";
import {
  getPreviewApiKey,
  validatePreviewParams,
} from "@/lib/config/preview";
import { isPreviewEnabledForUser } from "@/lib/posthog-server";
import { runConsensusWorkflow } from "./workflow";

export const maxDuration = 800; // ~13 minutes with Fluid Compute
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
 * Supports both authenticated (BYOK) and preview modes
 */
export async function POST(request: NextRequest) {
  const session = await auth();

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

    // Determine if this is a preview run or authenticated BYOK run
    // Preview mode: no session OR session with no API keys configured
    let isPreviewMode = false;
    let keys: Record<string, string | null> = {
      anthropic: null,
      openai: null,
      google: null,
      tavily: null,
      openrouter: null,
    };
    let previewUserIdentifier: string | null = null;

    if (session?.user?.id) {
      // Authenticated user - check if they have API keys
      keys = await getApiKeys(session.user.id);
      const hasAnyKey = keys.anthropic || keys.openai || keys.google || keys.openrouter;
      isPreviewMode = !hasAnyKey;
    } else {
      // No session - preview mode only
      isPreviewMode = true;
    }

    // Handle preview mode
    if (isPreviewMode) {
      // Get user identifier for preview tracking
      previewUserIdentifier = getPreviewUserIdentifier(request);

      // Check if preview system is enabled (includes feature flag check)
      const previewEnabled = await isPreviewEnabledForUser(previewUserIdentifier);
      if (!previewEnabled) {
        return new Response(
          JSON.stringify({
            error: "Preview mode is not available. Please sign in and add your API keys.",
          }),
          { status: 403, headers: { "Content-Type": "application/json" } }
        );
      }

      // Check preview usage
      const previewStatus = await getPreviewStatus(previewUserIdentifier);
      if (previewStatus.runsRemaining <= 0) {
        return new Response(
          JSON.stringify({
            error: "Preview limit reached. Add your API key for unlimited access.",
            previewExhausted: true,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate params against preview constraints
      const validation = validatePreviewParams({
        models: models.map((m) => m.modelId),
        rounds: maxRounds,
        participants: models.length,
      });

      if (!validation.valid) {
        return new Response(
          JSON.stringify({
            error: `Preview constraints: ${validation.errors.join("; ")}`,
            previewConstraintViolation: true,
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Web search not available in preview mode
      if (enableSearch) {
        return new Response(
          JSON.stringify({
            error: "Web search is not available in preview mode. Add your API keys to enable search.",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Set up preview API key for OpenRouter
      keys.openrouter = getPreviewApiKey();

      console.log(`[Consensus] Preview mode: user=${previewUserIdentifier.substring(0, 8)}..., runsRemaining=${previewStatus.runsRemaining}`);
    }

    // Validate Tavily key if search enabled (only for BYOK mode)
    const tavilyKey = enableSearch ? keys.tavily : null;
    if (enableSearch && !tavilyKey) {
      return new Response(
        JSON.stringify({ error: "Missing Tavily API key for web search. Please add your key in settings." }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check feature flag for targeted refinement prompts
    // TODO: Re-enable feature flag check once PostHog is debugged
    const useTargetedRefinement = true; // Temporarily hardcoded for testing

    // Log request summary
    console.log(`[Consensus] Starting: ${models.length} models, evaluator=${evaluatorModel}, maxRounds=${maxRounds}, threshold=${consensusThreshold}%, search=${enableSearch}, targetedRefinement=${useTargetedRefinement}, mode=${isPreviewMode ? "preview" : "byok"}`);

    // Build KeySet for routing decisions
    const keySet: KeySet = {
      anthropic: keys.anthropic,
      openai: keys.openai,
      google: keys.google,
      openrouter: keys.openrouter,
    };

    // Validate all selected models have API keys (direct or via OpenRouter)
    for (const model of models) {
      const route = getRouteForModel(model.modelId, keySet);
      if (!route) {
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

    // Check if evaluator can be called (direct key or OpenRouter)
    const evaluatorRoute = getRouteForModel(evaluatorModel, keySet);
    const evaluatorProvider = evaluatorRoute?.provider || resolveProvider(evaluatorModel) || "unknown";
    if (!evaluatorRoute) {
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

    // Get the actual key and model ID for the evaluator based on routing
    const evaluatorKey = evaluatorRoute.source === "direct"
      ? keys[evaluatorRoute.provider as keyof typeof keys]!
      : keys.openrouter!;
    const evaluatorModelId = evaluatorRoute.modelId;

    // Create database record (skip for preview mode - no user ID)
    let conversationId: number | null = null;
    if (!isPreviewMode && session?.user?.id) {
      conversationId = await createConsensusConversation(
        session.user.id,
        prompt,
        maxRounds,
        consensusThreshold
      );
    }

    // Start the durable workflow
    const startTime = Date.now();
    const userId = session?.user?.id || (previewUserIdentifier ? `preview:${previewUserIdentifier}` : "anonymous");

    const run = await start(runConsensusWorkflow, [{
      prompt,
      models: models as ModelSelection[],
      maxRounds,
      consensusThreshold,
      evaluatorModel: evaluatorModelId,
      evaluatorKey,
      evaluatorProvider,
      enableSearch,
      tavilyKey,
      useTargetedRefinement,
      keySet,
      conversationId,
      isPreviewMode,
      previewUserIdentifier,
      startTime,
      userId,
    }]);

    // Return the workflow's readable stream as SSE response
    return new Response(run.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    logger.error("Error in consensus route", error);

    // Capture to PostHog server-side
    captureServerException(
      error instanceof Error ? error : new Error("Unknown error in consensus route"),
      session?.user?.id || "anonymous",
      {
        error_type: "consensus_route_error",
      }
    );

    return new Response("Internal server error", { status: 500 });
  }
}
