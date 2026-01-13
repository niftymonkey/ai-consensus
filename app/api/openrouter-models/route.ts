import { NextRequest, NextResponse } from "next/server";
import {
  fetchOpenRouterModels,
  groupModelsByProvider,
  getProviders,
} from "@/lib/openrouter-models";
import { PREVIEW_ALLOWED_MODELS, isModelAllowedInPreview } from "@/lib/config/preview";

export const runtime = "nodejs";

/**
 * GET /api/openrouter-models
 *
 * Returns the OpenRouter model catalog, grouped by provider.
 * This is public data from OpenRouter's API - no auth required.
 *
 * Query params:
 * - preview=true: Filter to only preview-allowed models
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const isPreviewMode = searchParams.get("preview") === "true";

    let models = await fetchOpenRouterModels();

    // Filter to preview-allowed models if in preview mode
    if (isPreviewMode) {
      models = models.filter((model) => isModelAllowedInPreview(model.id));
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
        isPreviewMode,
        ...(isPreviewMode && { previewAllowedModels: PREVIEW_ALLOWED_MODELS }),
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
