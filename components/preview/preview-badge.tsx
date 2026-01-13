"use client";

import { cn } from "@/lib/utils";

interface PreviewBadgeProps {
  runsRemaining: number;
  totalAllowed: number;
  className?: string;
}

export function PreviewBadge({ runsRemaining, totalAllowed, className }: PreviewBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-background text-accent-foreground border border-input",
        className
      )}
    >
      {runsRemaining}/{totalAllowed} runs
    </span>
  );
}
