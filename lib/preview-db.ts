import { sql } from "@vercel/postgres";
import { createHash } from "crypto";

// Preview configuration constants
const MAX_PREVIEW_RUNS = 3;

export interface PreviewUsage {
  id: number;
  userIdentifier: string;
  runsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface PreviewStatus {
  runsUsed: number;
  runsRemaining: number;
  totalAllowed: number;
}

/**
 * Hash an IP address using SHA-256 for privacy-friendly storage
 */
export function hashIpAddress(ip: string): string {
  return createHash("sha256").update(ip).digest("hex");
}

/**
 * Get preview status for a user identifier (hashed IP)
 * Returns runs used, remaining, and total allowed
 */
export async function getPreviewStatus(
  userIdentifier: string
): Promise<PreviewStatus> {
  const result = await sql<{
    runs_used: number;
  }>`
    SELECT runs_used
    FROM preview_usage
    WHERE user_identifier = ${userIdentifier}
  `;

  const runsUsed = result.rows.length > 0 ? result.rows[0].runs_used : 0;

  return {
    runsUsed,
    runsRemaining: Math.max(0, MAX_PREVIEW_RUNS - runsUsed),
    totalAllowed: MAX_PREVIEW_RUNS,
  };
}

/**
 * Check if a user has remaining preview runs
 */
export async function hasPreviewRunsRemaining(
  userIdentifier: string
): Promise<boolean> {
  const status = await getPreviewStatus(userIdentifier);
  return status.runsRemaining > 0;
}

/**
 * Increment preview usage for a user
 * Creates a new record if first run, otherwise increments counter
 * Returns the updated preview status
 */
export async function incrementPreviewUsage(
  userIdentifier: string
): Promise<PreviewStatus> {
  // Upsert: insert new record or increment existing
  await sql`
    INSERT INTO preview_usage (user_identifier, runs_used, updated_at)
    VALUES (${userIdentifier}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (user_identifier)
    DO UPDATE SET
      runs_used = preview_usage.runs_used + 1,
      updated_at = CURRENT_TIMESTAMP
  `;

  return getPreviewStatus(userIdentifier);
}

/**
 * Get preview status from a raw IP address
 * Convenience function that handles hashing
 */
export async function getPreviewStatusFromIp(ip: string): Promise<PreviewStatus> {
  const userIdentifier = hashIpAddress(ip);
  return getPreviewStatus(userIdentifier);
}

/**
 * Increment preview usage from a raw IP address
 * Convenience function that handles hashing
 */
export async function incrementPreviewUsageFromIp(
  ip: string
): Promise<PreviewStatus> {
  const userIdentifier = hashIpAddress(ip);
  return incrementPreviewUsage(userIdentifier);
}
