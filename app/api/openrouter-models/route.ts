import { NextResponse } from "next/server";
import {
  fetchOpenRouterModels,
  groupModelsByProvider,
  getProviders,
} from "@/lib/openrouter-models";

export const runtime = "nodejs";

/**
 * GET /api/openrouter-models
 *
 * Returns the full OpenRouter model catalog, grouped by provider.
 * This is public data from OpenRouter's API - no auth required.
 */
export async function GET() {
  try {
    const models = await fetchOpenRouterModels();
    const grouped = groupModelsByProvider(models);
    const providers = getProviders(models);

    return NextResponse.json(
      {
        models,
        grouped,
        providers,
        count: models.length,
        timestamp: new Date().toISOString(),
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
