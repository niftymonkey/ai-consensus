import { NextRequest, NextResponse } from "next/server";
import { getPreviewUserIdentifier } from "@/lib/request-utils";
import { getPreviewStatus } from "@/lib/preview-db";
import { isPreviewEnabled, PREVIEW_CONFIG, PREVIEW_ALLOWED_MODELS } from "@/lib/config/preview";

export const runtime = "nodejs";

/**
 * GET /api/preview
 *
 * Returns preview status for the current user (identified by IP hash).
 * Includes runs used, remaining, allowed models, and constraints.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if preview system is enabled
    if (!isPreviewEnabled()) {
      return NextResponse.json(
        {
          enabled: false,
          message: "Preview system is not configured",
        },
        { status: 200 }
      );
    }

    // Get user identifier from request
    const userIdentifier = getPreviewUserIdentifier(request);

    // Get preview status from database
    const status = await getPreviewStatus(userIdentifier);

    return NextResponse.json(
      {
        enabled: true,
        ...status,
        constraints: {
          maxRounds: PREVIEW_CONFIG.maxRounds,
          maxParticipants: PREVIEW_CONFIG.maxParticipants,
          allowedModels: PREVIEW_ALLOWED_MODELS,
        },
      },
      {
        headers: {
          // Short cache to reduce DB load, but keep it fresh
          "Cache-Control": "private, max-age=30",
        },
      }
    );
  } catch (error) {
    console.error("Error getting preview status:", error);
    return NextResponse.json(
      { error: "Failed to get preview status" },
      { status: 500 }
    );
  }
}
