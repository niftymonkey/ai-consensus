import { NextRequest, NextResponse } from "next/server";
import {
  fetchOpenRouterModels,
  groupModelsByProvider,
  getProviders,
} from "@/lib/openrouter-models";
import { TRIAL_ALLOWED_MODELS, isModelAllowedInTrial } from "@/lib/config/trial";

export const runtime = "nodejs";

/**
 * GET /api/openrouter-models
 *
 * Returns the OpenRouter model catalog, grouped by provider.
 * This is public data from OpenRouter's API - no auth required.
 *
 * Query params:
 * - trial=true: Filter to only trial-allowed models
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isTrialMode = searchParams.get("trial") === "true";

    let models = await fetchOpenRouterModels();

    // Filter to trial-allowed models if in trial mode
    if (isTrialMode) {
      models = models.filter((model) => isModelAllowedInTrial(model.id));
    }

    const grouped = groupModelsByProvider(models);
    const providers = getProviders(models);

    return NextResponse.json(
      {
        models,
        grouped,
        providers,
        count: models.length,
        timestamp: new Date().toISOString(),
        isTrialMode,
        ...(isTrialMode && { trialAllowedModels: TRIAL_ALLOWED_MODELS }),
      },
      {
        headers: {
          // Public data, can be cached more aggressively
          "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching OpenRouter models:", error);
    return NextResponse.json(
      { error: "Failed to fetch models" },
      { status: 500 }
    );
  }
}
