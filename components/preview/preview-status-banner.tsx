"use client";

import { usePreviewStatus } from "@/hooks/use-preview-status";
import { PreviewBanner } from "./preview-banner";
import { Skeleton } from "@/components/ui/skeleton";

interface PreviewStatusBannerProps {
  /** If true, show banner even when user has 0 runs (exhausted state) */
  showWhenExhausted?: boolean;
  className?: string;
}

/**
 * Smart wrapper that fetches preview status and conditionally renders the banner.
 * Only shows for preview users (enabled=true), hides for BYOK users.
 */
export function PreviewStatusBanner({
  showWhenExhausted = true,
  className,
}: PreviewStatusBannerProps) {
  const { status, isLoading } = usePreviewStatus();

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
