import { PostHog } from "posthog-node";

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
