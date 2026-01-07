"use client";

import { useSession } from "next-auth/react";
import { useRef } from "react";
import posthog from "posthog-js";

/**
 * Component that identifies the user in PostHog when they are logged in.
 * Uses a ref to track if we've already identified to avoid duplicate calls.
 */
export function PostHogIdentify() {
  const { data: session, status } = useSession();
  const identifiedRef = useRef<string | null>(null);

  // Identify user when session becomes available
  if (status === "authenticated" && session?.user?.email) {
    const email = session.user.email;

    // Only identify if we haven't already identified this user
    if (identifiedRef.current !== email) {
      posthog.identify(email, {
        email: email,
        name: session.user.name,
      });
      identifiedRef.current = email;
    }
  }

  // Reset when user logs out
  if (status === "unauthenticated" && identifiedRef.current !== null) {
    identifiedRef.current = null;
  }

  return null;
}
