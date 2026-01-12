"use client";

import { cn } from "@/lib/utils";
import { TrialBadge } from "./trial-badge";
import { TrialUpgradeCta } from "./trial-upgrade-cta";
import { Sparkles } from "lucide-react";

type Urgency = "info" | "warning" | "error";

interface TrialBannerProps {
  runsRemaining: number;
  totalAllowed: number;
  className?: string;
}

function getUrgency(runsRemaining: number): Urgency {
  if (runsRemaining === 0) return "error";
  if (runsRemaining === 1) return "warning";
  return "info";
}

const bannerStyles: Record<Urgency, string> = {
  info: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  warning: "bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800",
  error: "bg-red-50 border-red-200 dark:bg-red-950/30 dark:border-red-800",
};

const iconStyles: Record<Urgency, string> = {
  info: "text-blue-600 dark:text-blue-400",
  warning: "text-yellow-600 dark:text-yellow-400",
  error: "text-red-600 dark:text-red-400",
};

function getMessage(runsRemaining: number): string {
  if (runsRemaining === 0) {
    return "You've used all your free runs.";
  }
  if (runsRemaining === 1) {
    return "Last free run!";
  }
  return "You're using free trial mode.";
}

export function TrialBanner({ runsRemaining, totalAllowed, className }: TrialBannerProps) {
  const urgency = getUrgency(runsRemaining);
  const message = getMessage(runsRemaining);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border",
        bannerStyles[urgency],
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Sparkles className={cn("h-5 w-5 shrink-0", iconStyles[urgency])} />
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <span className="text-sm font-medium">{message}</span>
          <TrialBadge runsRemaining={runsRemaining} totalAllowed={totalAllowed} />
        </div>
      </div>
      <TrialUpgradeCta variant="outline" size="sm" />
    </div>
  );
}
