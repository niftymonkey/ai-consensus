"use client";

import { usePreviewStatus, type PreviewStatus } from "@/hooks/use-preview-status";
import { PreviewBanner } from "./preview-banner";
import { Skeleton } from "@/components/ui/skeleton";

interface PreviewStatusBannerProps {
  /** If true, show banner even when user has 0 runs (exhausted state) */
  showWhenExhausted?: boolean;
  className?: string;
  /** Optional: pass status directly instead of using internal hook (for shared state) */
  status?: PreviewStatus | null;
  isLoading?: boolean;
}

/**
 * Smart wrapper that renders the preview banner.
 * Can either use its own hook or accept status as props (for shared state scenarios).
 */
export function PreviewStatusBanner({
  showWhenExhausted = true,
  className,
  status: propStatus,
  isLoading: propIsLoading,
}: PreviewStatusBannerProps) {
  // Use internal hook only if status not provided as prop
  const hook = usePreviewStatus();
  const status = propStatus !== undefined ? propStatus : hook.status;
  const isLoading = propIsLoading !== undefined ? propIsLoading : hook.isLoading;

  // Loading state - show skeleton
  if (isLoading) {
    return <Skeleton className="h-14 w-full rounded-lg" />;
  }

  // Not in preview mode (BYOK user or preview disabled)
  if (!status?.enabled) {
    return null;
  }

  // Optionally hide when exhausted
  if (!showWhenExhausted && status.runsRemaining === 0) {
    return null;
  }

  return (
    <PreviewBanner
      runsRemaining={status.runsRemaining}
      totalAllowed={status.totalAllowed}
      className={className}
    />
  );
}
