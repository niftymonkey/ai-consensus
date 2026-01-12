"use client";

import { cn } from "@/lib/utils";

type Urgency = "info" | "warning" | "error";

interface TrialBadgeProps {
  runsRemaining: number;
  totalAllowed: number;
  className?: string;
}

function getUrgency(runsRemaining: number): Urgency {
  if (runsRemaining === 0) return "error";
  if (runsRemaining === 1) return "warning";
  return "info";
}

const urgencyStyles: Record<Urgency, string> = {
  info: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  warning: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  error: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function TrialBadge({ runsRemaining, totalAllowed, className }: TrialBadgeProps) {
  const urgency = getUrgency(runsRemaining);

  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
        urgencyStyles[urgency],
        className
      )}
    >
      {runsRemaining} of {totalAllowed} free runs left
    </span>
  );
}
