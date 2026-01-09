import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { checkProviderAvailability } from "@/lib/provider-availability";
import { fetchOpenRouterModels } from "@/lib/openrouter-models";
import { filterAndMapModelsForDirectKeys } from "@/lib/model-availability";

export const runtime = "nodejs";

/**
 * GET /api/models/available
 *
 * Returns filtered model lists based on API key availability.
 *
 * Two-phase filtering:
 * 1. Filter based on which keys exist (OpenRouter vs direct keys)
 * 2. For direct keys, call provider APIs to check which models are actually available
 *
 * Priority: Direct provider keys take precedence over OpenRouter.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's API keys from database
    const keys = await getApiKeys(session.user.id);

    // Determine which providers have keys configured
    const hasKeys = {
      anthropic: !!keys.anthropic,
      openai: !!keys.openai,
      google: !!keys.google,
      tavily: !!keys.tavily,
      openrouter: !!keys.openrouter,
    };

    // Get the full OpenRouter catalog for model metadata
    const catalog = await fetchOpenRouterModels();

    // If user has OpenRouter key, they can access all models (with OpenRouter format IDs)
    if (hasKeys.openrouter) {
      return NextResponse.json(
        {
          models: catalog,
          hasKeys,
          providerModels: null, // Not needed when OpenRouter is available
          errors: {},
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // No OpenRouter key - filter to only direct providers and map to direct provider IDs
    // Step 1: Check which models are actually available for each provider's API key
    const availability = await checkProviderAvailability(keys);

    // Step 2: Filter and map using tested model-availability module
    // This ensures:
    // - Only models from providers with keys
    // - Only models available in provider APIs
    // - Direct provider format IDs (not OpenRouter format)
    // - No duplicate model IDs
    const filteredModels = filterAndMapModelsForDirectKeys(
      catalog,
      availability,
      {
        anthropic: hasKeys.anthropic,
        openai: hasKeys.openai,
        google: hasKeys.google,
      }
    );

    // Build provider-specific model lists for debugging/transparency
    const providerModels: Record<string, string[]> = {
      anthropic: availability.anthropic,
      openai: availability.openai,
      google: availability.google,
    };

    return NextResponse.json(
      {
        models: filteredModels,
        hasKeys,
        providerModels,
        errors: availability.errors,
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Error fetching available models:", error);

    // Fallback: return models based only on which keys exist (skip provider check)
    // Note: These will have OpenRouter format IDs which may not work with direct providers
    try {
      const keys = await getApiKeys(session.user.id);
      const catalog = await fetchOpenRouterModels();

      const hasKeys = {
        anthropic: !!keys.anthropic,
        openai: !!keys.openai,
        google: !!keys.google,
        tavily: !!keys.tavily,
        openrouter: !!keys.openrouter,
      };

      // If OpenRouter key, return all
      if (hasKeys.openrouter) {
        return NextResponse.json({
          models: catalog,
          hasKeys,
          providerModels: null,
          errors: { general: "Failed to check provider availability" },
          fallback: true,
          timestamp: new Date().toISOString(),
        });
      }

      // Filter to direct providers only (but keep OpenRouter format IDs as fallback)
      const DIRECT_PROVIDERS = ["anthropic", "openai", "google"];
      const filteredModels = catalog.filter((model) => {
        if (!DIRECT_PROVIDERS.includes(model.provider)) {
          return false;
        }
        return hasKeys[model.provider as keyof typeof hasKeys];
      });

      return NextResponse.json({
        models: filteredModels,
        hasKeys,
        providerModels: null,
        errors: { general: "Failed to check provider availability - models may not work" },
        fallback: true,
        timestamp: new Date().toISOString(),
      });
    } catch (fallbackError) {
      console.error("Fallback also failed:", fallbackError);
      return NextResponse.json(
        { error: "Failed to fetch available models" },
        { status: 500 }
      );
    }
  }
}
