import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys } from "@/lib/db";
import { checkProviderAvailability } from "@/lib/provider-availability";
import { ANTHROPIC_MODELS, OPENAI_MODELS, GOOGLE_MODELS } from "@/lib/models";

export const runtime = "nodejs";

/**
 * GET /api/models/available
 *
 * Returns filtered model lists based on API key availability.
 * Checks which models are actually available for the user's API keys
 * by calling provider APIs.
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
    };

    // Check model availability from provider APIs
    const availability = await checkProviderAvailability(keys);

    // Helper function to filter models based on availability
    const filterModels = (
      provider: "anthropic" | "openai" | "google",
      allModels: readonly any[]
    ) => {
      // If no API key for this provider, return empty array
      if (!hasKeys[provider]) {
        return [];
      }

      const availableIds = availability[provider];

      // If API check failed or returned empty, show all models (fail-open)
      if (availableIds.length === 0 && !availability.errors[provider]) {
        return allModels.map((m) => ({ ...m, provider }));
      }

      // If we got an error, show all models as fallback
      if (availability.errors[provider]) {
        return allModels.map((m) => ({ ...m, provider }));
      }

      // Filter to only available models
      return allModels
        .filter((model) => availableIds.includes(model.id))
        .map((m) => ({ ...m, provider }));
    };

    const response = {
      models: {
        anthropic: filterModels("anthropic", ANTHROPIC_MODELS),
        openai: filterModels("openai", OPENAI_MODELS),
        google: filterModels("google", GOOGLE_MODELS),
      },
      hasKeys,
      errors: availability.errors,
      timestamp: new Date().toISOString(),
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "private, max-age=300", // Cache for 5 minutes
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
    }));

    return NextResponse.json(
      {
        models: {
          anthropic: keys.anthropic
            ? ANTHROPIC_MODELS.map((m) => ({ ...m, provider: "anthropic" as const }))
            : [],
          openai: keys.openai
            ? OPENAI_MODELS.map((m) => ({ ...m, provider: "openai" as const }))
            : [],
          google: keys.google
            ? GOOGLE_MODELS.map((m) => ({ ...m, provider: "google" as const }))
            : [],
        },
        hasKeys: {
          anthropic: !!keys.anthropic,
          openai: !!keys.openai,
          google: !!keys.google,
          tavily: !!keys.tavily,
        },
        errors: { general: "Failed to check model availability" },
        fallback: true,
      },
      {
        headers: {
          "Cache-Control": "private, max-age=60", // Shorter cache on error
        },
      }
    );
  }
}
