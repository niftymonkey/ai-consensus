"use client";

import { useState, useEffect } from "react";
import posthog from "posthog-js";
import { PRESETS, type PresetId } from "@/lib/presets";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SuggestionConfig {
  prompt: string;
  preset: PresetId;
}

interface PromptSuggestionsProps {
  onSelect: (prompt: string, preset: PresetId) => void;
  disabled?: boolean;
  show?: boolean;
  isPreviewMode?: boolean;
}

// Map each suggestion to its ideal preset
const SUGGESTION_CONFIGS: SuggestionConfig[] = [
  { prompt: "Implement debounce in TypeScript", preset: "coding" },
  { prompt: "What is the meaning of life?", preset: "creative" },
  { prompt: "What's the next transformative technology?", preset: "research" },
];

export const PROMPT_SUGGESTIONS = SUGGESTION_CONFIGS.map(s => s.prompt);

const STORAGE_KEY = "usedPromptSuggestions";

export function PromptSuggestions({ onSelect, disabled, show = true, isPreviewMode = false }: PromptSuggestionsProps) {
  const [usedSuggestions, setUsedSuggestions] = useState<Set<string>>(new Set());

  // Load used suggestions from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setUsedSuggestions(new Set(JSON.parse(stored)));
      }
    } catch (error) {
      console.error("Failed to load used suggestions:", error);
    }
  }, []);

  const handleSelect = (config: SuggestionConfig) => {
    // Mark as used and persist
    const newUsed = new Set(usedSuggestions);
    newUsed.add(config.prompt);
    setUsedSuggestions(newUsed);

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...newUsed]));
    } catch (error) {
      console.error("Failed to save used suggestions:", error);
    }

    // Track prompt suggestion clicked
    posthog.capture("prompt_suggestion_clicked", {
      suggestion: config.prompt,
      suggestion_length: config.prompt.length,
      preset: config.preset,
    });

    onSelect(config.prompt, config.preset);
  };

  // Filter out used suggestions
  const availableSuggestions = SUGGESTION_CONFIGS.filter(s => !usedSuggestions.has(s.prompt));

  if (!show || availableSuggestions.length === 0) {
    return null;
  }

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-wrap gap-2">
        {availableSuggestions.map((config) => {
          const presetName = PRESETS[config.preset]?.name ?? config.preset;
          return (
            <Tooltip key={config.prompt}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handleSelect(config)}
                  disabled={disabled}
                  className="px-3 py-1.5 text-sm rounded-full border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {config.prompt}
                </button>
              </TooltipTrigger>
              <TooltipContent>
                {isPreviewMode && config.preset !== "casual"
                  ? `Normally uses ${presetName} preset`
                  : `Uses ${presetName} preset`}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
