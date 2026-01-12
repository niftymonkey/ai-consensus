"use client";

import { cn } from "@/lib/utils";
import { PreviewUpgradeCta } from "./preview-upgrade-cta";
import { Sparkles } from "lucide-react";

interface PreviewBannerProps {
  runsRemaining: number;
  totalAllowed: number;
  className?: string;
}

function getMessage(runsRemaining: number): string {
  if (runsRemaining === 0) {
    return "Preview runs used";
  }
  return "Preview";
}

export function PreviewBanner({ runsRemaining, totalAllowed, className }: PreviewBannerProps) {
  const message = getMessage(runsRemaining);

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 px-4 py-3 rounded-lg border border-border bg-accent",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Sparkles className="h-5 w-5 shrink-0 text-accent-foreground" />
        <span className="text-sm font-medium text-accent-foreground">{message}</span>
        <span className="text-accent-foreground/30">|</span>
        <span className="text-sm font-medium text-accent-foreground">{runsRemaining} of {totalAllowed} runs</span>
        <span className="hidden sm:inline text-accent-foreground/30">|</span>
        <span className="hidden sm:inline text-sm text-accent-foreground/70">
          Bring your own key to access all models & presets
        </span>
      </div>
      <PreviewUpgradeCta variant="outline" size="sm" />
    </div>
  );
}
