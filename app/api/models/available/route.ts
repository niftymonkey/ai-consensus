import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { checkProviderAvailability } from "@/lib/provider-availability";
import { ANTHROPIC_MODELS, OPENAI_MODELS, GOOGLE_MODELS } from "@/lib/models";
import { checkOpenRouterAvailability } from "@/lib/openrouter";

export const runtime = "nodejs";

/**
 * GET /api/models/available
 *
 * Returns filtered model lists based on API key availability.
 * Checks which models are actually available for the user's API keys
 * by calling provider APIs.
 *
 * Priority: Direct provider keys take precedence over OpenRouter.
 * If user has both Anthropic key and OpenRouter key, Anthropic models
 * use the direct key.
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

    // Check direct provider model availability (only for providers with direct keys)
    const availability = await checkProviderAvailability(keys);

    // Check OpenRouter availability if key is present
    let openrouterAvailable = false;
    if (keys.openrouter) {
      const orCheck = await checkOpenRouterAvailability(keys.openrouter);
      openrouterAvailable = orCheck.available;
      if (!orCheck.available) {
        availability.errors.openrouter = orCheck.error || "OpenRouter unavailable";
      }
    }

    // Helper function to filter models based on availability
    // Priority: Direct keys > OpenRouter
    const filterModels = (
      provider: "anthropic" | "openai" | "google",
      allModels: readonly any[]
    ) => {
      const hasDirectKey = hasKeys[provider];
      const canUseOpenRouter = openrouterAvailable && !hasDirectKey;

      // If no direct key and no OpenRouter, return empty
      if (!hasDirectKey && !canUseOpenRouter) {
        return [];
      }

      // If using OpenRouter (no direct key), return all models marked as openrouter source
      if (canUseOpenRouter) {
        return allModels.map((m) => ({
          ...m,
          provider,
          source: "openrouter" as const,
        }));
      }

      // Using direct key - check availability
      const availableIds = availability[provider];

      // If API check failed or returned empty, show all models (fail-open)
      if (availableIds.length === 0 && !availability.errors[provider]) {
        return allModels.map((m) => ({ ...m, provider, source: "direct" as const }));
      }

      // If we got an error, show all models as fallback
      if (availability.errors[provider]) {
        return allModels.map((m) => ({ ...m, provider, source: "direct" as const }));
      }

      // Filter to only available models
      return allModels
        .filter((model) => availableIds.includes(model.id))
        .map((m) => ({ ...m, provider, source: "direct" as const }));
    };

    const response = {
      models: {
        anthropic: filterModels("anthropic", ANTHROPIC_MODELS),
        openai: filterModels("openai", OPENAI_MODELS),
        google: filterModels("google", GOOGLE_MODELS),
      },
      hasKeys,
      openrouterAvailable,
      errors: availability.errors,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store", // Don't cache - keys can change anytime
      },
    });
  } catch (error) {
    console.error("Error fetching available models:", error);

    // Fallback: return all models if error occurs
    const keys = await getApiKeys(session.user.id).catch(() => ({
      anthropic: null,
      openai: null,
      google: null,
      tavily: null,
      openrouter: null,
    }));

    return NextResponse.json(
      {
        models: {
          anthropic: keys.anthropic || keys.openrouter
            ? ANTHROPIC_MODELS.map((m) => ({
                ...m,
                provider: "anthropic" as const,
                source: keys.anthropic ? "direct" as const : "openrouter" as const,
              }))
            : [],
          openai: keys.openai || keys.openrouter
            ? OPENAI_MODELS.map((m) => ({
                ...m,
                provider: "openai" as const,
                source: keys.openai ? "direct" as const : "openrouter" as const,
              }))
            : [],
          google: keys.google || keys.openrouter
            ? GOOGLE_MODELS.map((m) => ({
                ...m,
                provider: "google" as const,
                source: keys.google ? "direct" as const : "openrouter" as const,
              }))
            : [],
        },
        hasKeys: {
          anthropic: !!keys.anthropic,
          openai: !!keys.openai,
          google: !!keys.google,
          tavily: !!keys.tavily,
          openrouter: !!keys.openrouter,
        },
        openrouterAvailable: !!keys.openrouter,
        errors: { general: "Failed to check model availability" },
        fallback: true,
      },
      {
        headers: {
          "Cache-Control": "no-store", // Don't cache - keys can change anytime
        },
      }
    );
  }
}
