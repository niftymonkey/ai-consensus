import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { checkProviderAvailability } from "@/lib/provider-availability";
import { fetchOpenRouterModels } from "@/lib/openrouter-models";
import { filterAndMapModelsForDirectKeys } from "@/lib/model-availability";
import { isPreviewEnabled, PREVIEW_ALLOWED_MODELS } from "@/lib/config/preview";

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
  // Check for database connection - required for this endpoint
  if (!process.env.POSTGRES_URL) {
    // In test/CI environments without a database, return empty response
    // E2E tests mock this endpoint, so this only happens during SSR warm-up
    return NextResponse.json(
      {
        models: [],
        hasKeys: {
          anthropic: false,
          openai: false,
          google: false,
          tavily: false,
          openrouter: false,
        },
        providerModels: null,
        errors: { database: "Database not configured" },
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  }

  const session = await auth();

  // For unauthenticated users, return preview models if preview is enabled
  if (!session?.user?.id) {
    if (isPreviewEnabled()) {
      const catalog = await fetchOpenRouterModels();
      const previewModels = catalog.filter(model =>
        PREVIEW_ALLOWED_MODELS.includes(model.id as typeof PREVIEW_ALLOWED_MODELS[number])
      );

      return NextResponse.json(
        {
          models: previewModels,
          hasKeys: {
            anthropic: false,
            openai: false,
            google: false,
            tavily: false,
            openrouter: false,
          },
          providerModels: null,
          errors: {},
          previewMode: true,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }
      );
    }

    // Preview not enabled, return empty models
    return NextResponse.json(
      {
        models: [],
        hasKeys: {
          anthropic: false,
          openai: false,
          google: false,
          tavily: false,
          openrouter: false,
        },
        providerModels: null,
        errors: {},
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
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

    // Check if user has any keys at all
    const hasAnyKey = hasKeys.openrouter || hasKeys.anthropic || hasKeys.openai || hasKeys.google;

    // If no keys but preview is enabled, return preview-allowed models
    if (!hasAnyKey && isPreviewEnabled()) {
      const catalog = await fetchOpenRouterModels();
      const previewModels = catalog.filter(model =>
        PREVIEW_ALLOWED_MODELS.includes(model.id as typeof PREVIEW_ALLOWED_MODELS[number])
      );

      return NextResponse.json(
        {
          models: previewModels,
          hasKeys,
          providerModels: null,
          errors: {},
          previewMode: true,
          timestamp: new Date().toISOString(),
        },
        {
          headers: {
            "Cache-Control": "no-store",
          },
        }
      );
    }

    // Get the full OpenRouter catalog for model metadata
    const catalog = await fetchOpenRouterModels();

    // Check if user has any direct provider keys
    const hasAnyDirectKey = hasKeys.anthropic || hasKeys.openai || hasKeys.google;

    // If user has OpenRouter key but NO direct keys, return all with OpenRouter format IDs
    if (hasKeys.openrouter && !hasAnyDirectKey) {
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

    // User has direct keys (with or without OpenRouter)
    // For providers with direct keys, we need direct format IDs since routing prefers direct
    // For providers without direct keys (but with OpenRouter), keep OpenRouter format

    // Step 1: Check which models are actually available for each provider's API key
    const availability = await checkProviderAvailability(keys);

    // Step 2: Filter and map direct provider models to direct format IDs
    // This ensures models from providers with direct keys use the correct ID format
    const directProviderModels = filterAndMapModelsForDirectKeys(
      catalog,
      availability,
      {
        anthropic: hasKeys.anthropic,
        openai: hasKeys.openai,
        google: hasKeys.google,
      }
    );

    // Step 3: If user has OpenRouter, also include non-direct provider models
    // These keep OpenRouter format IDs since they'll be routed through OpenRouter
    let finalModels = directProviderModels;

    if (hasKeys.openrouter) {
      const directProviders = ["anthropic", "openai", "google"];

      // Add non-direct provider models (meta-llama, mistral, etc.)
      // These keep OpenRouter format IDs since they'll be routed through OpenRouter
      const openRouterOnlyModels = catalog.filter(model => {
        // Skip direct providers - we already have those with correct IDs
        if (directProviders.includes(model.provider)) {
          return false;
        }
        // Include all other providers (will use OpenRouter)
        return true;
      });

      finalModels = [...directProviderModels, ...openRouterOnlyModels];
    }

    // Build provider-specific model lists for debugging/transparency
    const providerModels: Record<string, string[]> = {
      anthropic: availability.anthropic,
      openai: availability.openai,
      google: availability.google,
    };

    return NextResponse.json(
      {
        models: finalModels,
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
