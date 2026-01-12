"use client";

import { cn } from "@/lib/utils";
import { PRESETS, type PresetId, type PresetDefinition } from "@/lib/presets";
import { TRIAL_CONFIG } from "@/lib/config/trial";
import {
  Zap,
  Scale,
  FlaskConical,
  Code,
  Sparkles,
  Lock,
  type LucideIcon,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Scale,
  FlaskConical,
  Code,
  Sparkles,
};

interface TrialConstraints {
  maxRounds: number;
  maxParticipants: number;
  allowsSearch: boolean;
}

interface PresetSelectorProps {
  activePreset: PresetId | null;
  onPresetSelect: (presetId: PresetId) => void;
  disabled?: boolean;
  /** Trial constraints - if provided, presets exceeding limits will be disabled */
  trialConstraints?: TrialConstraints | null;
}

/**
 * Check if a preset exceeds trial constraints
 */
function getTrialDisabledReason(
  preset: PresetDefinition,
  constraints: TrialConstraints
): string | null {
  const reasons: string[] = [];

  if (preset.maxRounds > constraints.maxRounds) {
    reasons.push(`${preset.maxRounds} rounds (trial max: ${constraints.maxRounds})`);
  }
  if (preset.modelCount > constraints.maxParticipants) {
    reasons.push(`${preset.modelCount} models (trial max: ${constraints.maxParticipants})`);
  }

  if (reasons.length === 0) return null;
  return `Requires ${reasons.join(", ")}`;
}

export function PresetSelector({
  activePreset,
  onPresetSelect,
  disabled = false,
  trialConstraints = null,
}: PresetSelectorProps) {
  const presetList = Object.values(PRESETS);

  return (
    <TooltipProvider delayDuration={300}>
      <div className="w-full">
        {/* Responsive grid: wraps on mobile, single row on desktop */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 sm:gap-2">
          {presetList.map((preset) => {
            const Icon = ICON_MAP[preset.icon] || Zap;
            const isActive = activePreset === preset.id;

            // Check if this preset exceeds trial limits
            const trialDisabledReason = trialConstraints
              ? getTrialDisabledReason(preset, trialConstraints)
              : null;
            const isTrialDisabled = trialDisabledReason !== null;
            const isButtonDisabled = disabled || isTrialDisabled;

            return (
              <Tooltip key={preset.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => !isTrialDisabled && onPresetSelect(preset.id)}
                    disabled={isButtonDisabled}
                    className={cn(
                      "relative flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm hover:bg-primary/80 active:bg-primary/60"
                        : isTrialDisabled
                          ? "bg-muted/50 border-border text-muted-foreground"
                          : "bg-background hover:bg-muted border-border hover:border-muted-foreground/30"
                    )}
                  >
                    {isTrialDisabled ? (
                      <Lock className="h-4 w-4 shrink-0" />
                    ) : (
                      <Icon className="h-4 w-4 shrink-0" />
                    )}
                    <span className="text-xs sm:text-sm font-medium">
                      {preset.name}
                    </span>
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <p className="text-xs">
                    {preset.description}
                  </p>
                  <p className="text-xs mt-1">
                    {preset.modelCount} models, {preset.maxRounds} rounds, {preset.consensusThreshold}% threshold
                    {preset.enableSearch && ", web search"}
                  </p>
                  {isTrialDisabled && (
                    <p className="text-xs mt-2 text-amber-600 dark:text-amber-400 font-medium">
                      {trialDisabledReason}
                    </p>
                  )}
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
