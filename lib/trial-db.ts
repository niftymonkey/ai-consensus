import { sql } from "@vercel/postgres";
import { createHash } from "crypto";

// Trial configuration constants
const MAX_TRIAL_RUNS = 3;

export interface TrialUsage {
  id: number;
  userIdentifier: string;
  runsUsed: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrialStatus {
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
 * Get trial status for a user identifier (hashed IP)
 * Returns runs used, remaining, and total allowed
 */
export async function getTrialStatus(
  userIdentifier: string
): Promise<TrialStatus> {
  const result = await sql<{
    runs_used: number;
  }>`
    SELECT runs_used
    FROM trial_usage
    WHERE user_identifier = ${userIdentifier}
  `;

  const runsUsed = result.rows.length > 0 ? result.rows[0].runs_used : 0;

  return {
    runsUsed,
    runsRemaining: Math.max(0, MAX_TRIAL_RUNS - runsUsed),
    totalAllowed: MAX_TRIAL_RUNS,
  };
}

/**
 * Check if a user has remaining trial runs
 */
export async function hasTrialRunsRemaining(
  userIdentifier: string
): Promise<boolean> {
  const status = await getTrialStatus(userIdentifier);
  return status.runsRemaining > 0;
}

/**
 * Increment trial usage for a user
 * Creates a new record if first run, otherwise increments counter
 * Returns the updated trial status
 */
export async function incrementTrialUsage(
  userIdentifier: string
): Promise<TrialStatus> {
  // Upsert: insert new record or increment existing
  await sql`
    INSERT INTO trial_usage (user_identifier, runs_used, updated_at)
    VALUES (${userIdentifier}, 1, CURRENT_TIMESTAMP)
    ON CONFLICT (user_identifier)
    DO UPDATE SET
      runs_used = trial_usage.runs_used + 1,
      updated_at = CURRENT_TIMESTAMP
  `;

  return getTrialStatus(userIdentifier);
}

/**
 * Get trial status from a raw IP address
 * Convenience function that handles hashing
 */
export async function getTrialStatusFromIp(ip: string): Promise<TrialStatus> {
  const userIdentifier = hashIpAddress(ip);
  return getTrialStatus(userIdentifier);
}

/**
 * Increment trial usage from a raw IP address
 * Convenience function that handles hashing
 */
export async function incrementTrialUsageFromIp(
  ip: string
): Promise<TrialStatus> {
  const userIdentifier = hashIpAddress(ip);
  return incrementTrialUsage(userIdentifier);
}
