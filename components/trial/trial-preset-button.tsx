"use client";

import { cn } from "@/lib/utils";
import { Gift } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TRIAL_PRESET } from "@/lib/trial-preset";

interface TrialPresetButtonProps {
  isActive: boolean;
  onSelect: () => void;
  disabled?: boolean;
  runsRemaining?: number;
}

export function TrialPresetButton({
  isActive,
  onSelect,
  disabled = false,
  runsRemaining,
}: TrialPresetButtonProps) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onSelect}
            disabled={disabled}
            className={cn(
              "relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isActive
                ? "bg-green-600 text-white border-green-600 shadow-sm hover:bg-green-500"
                : "bg-green-50 hover:bg-green-100 border-green-300 text-green-800 dark:bg-green-950/30 dark:hover:bg-green-900/40 dark:border-green-700 dark:text-green-300"
            )}
          >
            <Gift className="h-4 w-4 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">
              {TRIAL_PRESET.name}
            </span>
            {runsRemaining !== undefined && (
              <span
                className={cn(
                  "ml-1 px-1.5 py-0.5 text-[10px] font-bold rounded-full",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200"
                )}
              >
                {runsRemaining}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <p className="text-xs">{TRIAL_PRESET.description}</p>
          <p className="text-xs mt-1">
            2 efficient models, {TRIAL_PRESET.maxRounds} rounds, {TRIAL_PRESET.consensusThreshold}% threshold
          </p>
          {runsRemaining !== undefined && (
            <p className="text-xs mt-1 font-medium">
              {runsRemaining} free {runsRemaining === 1 ? "run" : "runs"} remaining
            </p>
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
