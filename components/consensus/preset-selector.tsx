"use client";

import { cn } from "@/lib/utils";
import { PRESETS, type PresetId } from "@/lib/presets";
import {
  Zap,
  Scale,
  FlaskConical,
  Code,
  Sparkles,
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

interface PresetSelectorProps {
  activePreset: PresetId | null;
  onPresetSelect: (presetId: PresetId) => void;
  disabled?: boolean;
}

export function PresetSelector({
  activePreset,
  onPresetSelect,
  disabled = false,
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

            return (
              <Tooltip key={preset.id}>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => onPresetSelect(preset.id)}
                    disabled={disabled}
                    className={cn(
                      "flex items-center justify-center gap-2 px-3 py-2 rounded-lg border transition-all",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      isActive
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background hover:bg-muted border-border hover:border-muted-foreground/30"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
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
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
