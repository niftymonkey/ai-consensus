import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys, upsertApiKey, deleteApiKey, Provider } from "@/lib/db";
import { validateApiKey } from "@/lib/key-validation";
import { logger } from "@/lib/logger";

/**
 * GET /api/keys - Get user's API keys (masked for security)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    // Return empty keys for unauthenticated users (enables preview mode)
    return NextResponse.json({
      keys: {
        anthropic: null,
        openai: null,
        google: null,
        tavily: null,
        openrouter: null,
      },
    });
  }

  // Return empty keys in E2E tests when no database is available
  if (
    process.env.NODE_ENV !== "production" &&
    process.env.E2E_TEST_PASSWORD &&
    !process.env.POSTGRES_URL
  ) {
    return NextResponse.json({
      keys: {
        anthropic: null,
        openai: null,
        google: null,
        tavily: null,
        openrouter: null,
      },
    });
  }

  try {
    const keys = await getApiKeys(session.user.id);

    // Mask the keys for security (only show last 4 characters)
    const maskedKeys = {
      anthropic: keys.anthropic ? maskApiKey(keys.anthropic) : null,
      openai: keys.openai ? maskApiKey(keys.openai) : null,
      google: keys.google ? maskApiKey(keys.google) : null,
      tavily: keys.tavily ? maskApiKey(keys.tavily) : null,
      openrouter: keys.openrouter ? maskApiKey(keys.openrouter) : null,
    };

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    logger.error("Error fetching API keys", error);
    return NextResponse.json(
      { error: "Failed to fetch API keys" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/keys - Save or update API keys
 */
export async function POST(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { provider, apiKey } = body;

    if (!provider || !apiKey) {
      return NextResponse.json(
        { error: "Missing provider or apiKey" },
        { status: 400 }
      );
    }

    if (!isValidProvider(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // Basic validation for API key format
    if (typeof apiKey !== "string" || apiKey.trim().length === 0) {
      return NextResponse.json(
        { error: "Invalid API key format" },
        { status: 400 }
      );
    }

    // Validate the API key by making a test request (skip for tavily - no test endpoint)
    if (provider !== "tavily") {
      const validation = await validateApiKey(provider, apiKey.trim());
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error || "Invalid API key" },
          { status: 400 }
        );
      }
    }

    await upsertApiKey(session.user.id, provider, apiKey.trim());

    return NextResponse.json({
      success: true,
      maskedKey: maskApiKey(apiKey),
    });
  } catch (error) {
    logger.error("Error saving API key", error);
    return NextResponse.json(
      { error: "Failed to save API key" },
      { status: 500 }
    );
  }
}

/**
 * Mask an API key for display (show only last 4 characters)
 */
function maskApiKey(key: string): string {
  if (key.length <= 4) {
    return "****";
  }
  return "..." + key.slice(-4);
}

/**
 * Type guard to check if a string is a valid provider
 */
function isValidProvider(provider: string): provider is Provider {
  return ["anthropic", "openai", "google", "tavily", "openrouter"].includes(provider);
}

/**
 * DELETE /api/keys - Delete an API key
 */
export async function DELETE(request: NextRequest) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get("provider");

    if (!provider) {
      return NextResponse.json(
        { error: "Missing provider" },
        { status: 400 }
      );
    }

    if (!isValidProvider(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    await deleteApiKey(session.user.id, provider);

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting API key", error);
    return NextResponse.json(
      { error: "Failed to delete API key" },
      { status: 500 }
    );
  }
}
