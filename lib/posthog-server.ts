import { PostHog } from "posthog-node";
import { isPreviewEnabled } from "./config/preview";

const PREVIEW_FEATURE_FLAG = "preview-mode";

let posthogClient: PostHog | null = null;

export function getPostHogClient() {
  if (!posthogClient) {
    posthogClient = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST,
      flushAt: 1,
      flushInterval: 0,
      // Enable automatic capture of uncaught exceptions
      enableExceptionAutocapture: true,
    });
  }
  return posthogClient;
}

export async function shutdownPostHog() {
  if (posthogClient) {
    await posthogClient.shutdown();
  }
}

/**
 * Capture an exception to PostHog from server-side code.
 * Use this for caught exceptions that should be tracked.
 *
 * @param error - The error to capture
 * @param distinctId - User ID (use "anonymous" if not available)
 * @param properties - Additional context about the error
 */
export function captureServerException(
  error: Error,
  distinctId: string = "anonymous",
  properties?: Record<string, unknown>
) {
  const client = getPostHogClient();
  client.captureException(error, distinctId, properties);
}

/**
 * Check if preview is enabled for a specific user (with feature flag support)
 * Requires both: API key configured AND feature flag enabled for the user
 *
 * @param distinctId - User identifier (IP hash for anonymous users)
 * @returns Whether preview is enabled for this user
 */
export async function isPreviewEnabledForUser(distinctId: string): Promise<boolean> {
  // First check if API key is configured
  if (!isPreviewEnabled()) {
    return false;
  }

  // Then check PostHog feature flag
  try {
    const posthog = getPostHogClient();
    const flagEnabled = await posthog.isFeatureEnabled(PREVIEW_FEATURE_FLAG, distinctId);
    return flagEnabled ?? false;
  } catch (error) {
    // If PostHog fails, fall back to allowing preview (fail open)
    console.error("PostHog feature flag check failed:", error);
    return true;
  }
}
