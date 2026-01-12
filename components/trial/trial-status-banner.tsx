"use client";

import { useTrialStatus } from "@/hooks/use-trial-status";
import { TrialBanner } from "./trial-banner";
import { Skeleton } from "@/components/ui/skeleton";

interface TrialStatusBannerProps {
  /** If true, show banner even when user has 0 runs (exhausted state) */
  showWhenExhausted?: boolean;
  className?: string;
}

/**
 * Smart wrapper that fetches trial status and conditionally renders the banner.
 * Only shows for trial users (enabled=true), hides for BYOK users.
 */
export function TrialStatusBanner({
  showWhenExhausted = true,
  className,
}: TrialStatusBannerProps) {
  const { status, isLoading } = useTrialStatus();

  // Loading state - show skeleton
  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-lg" />;
  }

  // Not in trial mode (BYOK user or trial disabled)
  if (!status?.enabled) {
    return null;
  }

  // Optionally hide when exhausted
  if (!showWhenExhausted && status.runsRemaining === 0) {
    return null;
  }

  return (
    <TrialBanner
      runsRemaining={status.runsRemaining}
      totalAllowed={status.totalAllowed}
      className={className}
    />
  );
}
