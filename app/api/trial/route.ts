import { NextRequest, NextResponse } from "next/server";
import { getTrialUserIdentifier } from "@/lib/request-utils";
import { getTrialStatus } from "@/lib/trial-db";
import { isTrialEnabled, TRIAL_CONFIG, TRIAL_ALLOWED_MODELS } from "@/lib/config/trial";

export const runtime = "nodejs";

/**
 * GET /api/trial
 *
 * Returns trial status for the current user (identified by IP hash).
 * Includes runs used, remaining, allowed models, and constraints.
 */
export async function GET(request: NextRequest) {
  try {
    // Check if trial system is enabled
    if (!isTrialEnabled()) {
      return NextResponse.json(
        {
          enabled: false,
          message: "Trial system is not configured",
        },
        { status: 200 }
      );
    }

    // Get user identifier from request
    const userIdentifier = getTrialUserIdentifier(request);

    // Get trial status from database
    const status = await getTrialStatus(userIdentifier);

    return NextResponse.json(
      {
        enabled: true,
        ...status,
        constraints: {
          maxRounds: TRIAL_CONFIG.maxRounds,
          maxParticipants: TRIAL_CONFIG.maxParticipants,
          allowedModels: TRIAL_ALLOWED_MODELS,
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
    console.error("Error getting trial status:", error);
    return NextResponse.json(
      { error: "Failed to get trial status" },
      { status: 500 }
    );
  }
}
