import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getApiKeys, upsertApiKey, Provider } from "@/lib/db";

/**
 * GET /api/keys - Get user's API keys (masked for security)
 */
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const keys = await getApiKeys(session.user.id);

    // Mask the keys for security (only show last 4 characters)
    const maskedKeys = {
      anthropic: keys.anthropic ? maskApiKey(keys.anthropic) : null,
      openai: keys.openai ? maskApiKey(keys.openai) : null,
      google: keys.google ? maskApiKey(keys.google) : null,
    };

    return NextResponse.json({ keys: maskedKeys });
  } catch (error) {
    console.error("Error fetching API keys:", error);
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

    await upsertApiKey(session.user.id, provider, apiKey.trim());

    return NextResponse.json({
      success: true,
      maskedKey: maskApiKey(apiKey),
    });
  } catch (error) {
    console.error("Error saving API key:", error);
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
  return ["anthropic", "openai", "google"].includes(provider);
}
