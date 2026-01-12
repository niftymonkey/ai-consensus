"use client";

import { cn } from "@/lib/utils";

interface TrialBadgeProps {
  runsRemaining: number;
  totalAllowed: number;
  className?: string;
}

export function TrialBadge({ runsRemaining, totalAllowed, className }: TrialBadgeProps) {
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
