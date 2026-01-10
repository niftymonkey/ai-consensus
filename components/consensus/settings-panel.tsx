"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Zap,
  Scale,
  FlaskConical,
  Code,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import posthog from "posthog-js";
import { PresetSelector } from "./preset-selector";
import { ModelsSection } from "./models-section";
import { ProcessSection } from "./process-section";
import { PRESETS, type PresetId } from "@/lib/presets";
import type { ModelSelection } from "@/lib/types";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";

// Map icon names to Lucide components for collapsed state
const ICON_MAP: Record<string, LucideIcon> = {
  Zap,
  Scale,
  FlaskConical,
  Code,
  Sparkles,
};

interface AvailableKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
  tavily: boolean;
  openrouter: boolean;
}

interface ConsensusPreferences {
  models: Array<{ provider: string; modelId: string; label: string }>;
  maxRounds: number;
  threshold: number;
  evaluatorModel: string;
  enableSearch: boolean;
  activePreset: PresetId | null;
  presetModelIds?: string[]; // Model IDs that were set by the preset
  lastUpdated: number;
}

interface SettingsPanelProps {
  availableKeys: AvailableKeys;
  selectedModels: ModelSelection[];
  setSelectedModels: (models: ModelSelection[]) => void;
  maxRounds: number;
  setMaxRounds: (value: number) => void;
  consensusThreshold: number;
  setConsensusThreshold: (value: number) => void;
  evaluatorModel: string;
  setEvaluatorModel: (value: string) => void;
  enableSearch: boolean;
  setEnableSearch: (value: boolean) => void;
  disabled?: boolean;
  isProcessing?: boolean;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  openRouterModels: OpenRouterModelWithMeta[];
  openRouterGroupedModels: Record<string, OpenRouterModelWithMeta[]>;
  openRouterLoading?: boolean;
  activePreset: PresetId | null;
  presetModelIds: string[];
  onPresetSelect: (presetId: PresetId) => void;
}

const STORAGE_KEY = "consensusPreferences";

export function SettingsPanel({
  availableKeys,
  selectedModels,
  setSelectedModels,
  maxRounds,
  setMaxRounds,
  consensusThreshold,
  setConsensusThreshold,
  evaluatorModel,
  setEvaluatorModel,
  enableSearch,
  setEnableSearch,
  disabled = false,
  isProcessing = false,
  isExpanded,
  setIsExpanded,
  openRouterModels,
  openRouterGroupedModels,
  openRouterLoading = false,
  activePreset,
  presetModelIds,
  onPresetSelect,
}: SettingsPanelProps) {
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);
  const [skipNextSave, setSkipNextSave] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-collapse when processing starts
  useEffect(() => {
    if (isProcessing) {
      setIsExpanded(false);
    }
  }, [isProcessing, setIsExpanded]);

  // Load preferences on mount
  useEffect(() => {
    if (hasLoadedPreferences) return;
    if (openRouterLoading || openRouterModels.length === 0) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs: ConsensusPreferences = JSON.parse(stored);

        if (prefs.models && prefs.models.length >= 2) {
          const availableModelIds = new Set(openRouterModels.map((m) => m.id));
          const validModels = prefs.models.filter((m) =>
            availableModelIds.has(m.modelId)
          );

          if (validModels.length >= 2) {
            const restoredModels: ModelSelection[] = validModels.map(
              (m, idx) => ({
                id: `model-${idx + 1}`,
                provider: m.provider,
                modelId: m.modelId,
                label: m.label,
              })
            );
            setSelectedModels(restoredModels);
          }
        }

        setMaxRounds(prefs.maxRounds);
        setConsensusThreshold(prefs.threshold);
        setEvaluatorModel(prefs.evaluatorModel);
        if (prefs.enableSearch !== undefined && availableKeys.tavily) {
          setEnableSearch(prefs.enableSearch);
        }

        setIsExpanded(false);
        setSkipNextSave(true);
      }

      setHasLoadedPreferences(true);
    } catch (error) {
      console.error("Failed to load consensus preferences:", error);
      setHasLoadedPreferences(true);
    }
  }, [hasLoadedPreferences, setIsExpanded, openRouterLoading, openRouterModels, availableKeys.tavily, setSelectedModels, setMaxRounds, setConsensusThreshold, setEvaluatorModel, setEnableSearch]);

  // Save preferences
  const savePreferences = useCallback(() => {
    try {
      const prefs: ConsensusPreferences = {
        models: selectedModels.map((m) => ({
          provider: m.provider,
          modelId: m.modelId,
          label: m.label,
        })),
        maxRounds,
        threshold: consensusThreshold,
        evaluatorModel,
        enableSearch,
        activePreset,
        presetModelIds,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error("Failed to save consensus preferences:", error);
    }
  }, [selectedModels, maxRounds, consensusThreshold, evaluatorModel, enableSearch, activePreset, presetModelIds]);

  // Auto-save on changes (debounced)
  useEffect(() => {
    if (!hasLoadedPreferences) return;

    if (skipNextSave) {
      setSkipNextSave(false);
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      savePreferences();
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedModels, maxRounds, consensusThreshold, evaluatorModel, enableSearch, hasLoadedPreferences, skipNextSave, savePreferences]);

  const handleExpand = () => {
    if (disabled) return;
    setIsExpanded(true);
    posthog.capture("settings_panel_toggled", { expanded: true });
  };

  const handleCollapse = () => {
    setIsExpanded(false);
    posthog.capture("settings_panel_toggled", { expanded: false });
  };

  const handleSearchToggle = (checked: boolean) => {
    setEnableSearch(checked);
    posthog.capture("web_search_toggled", { enabled: checked });
  };

  // Get preset info for collapsed state
  const activePresetDef = activePreset ? PRESETS[activePreset] : null;
  const PresetIcon = activePresetDef ? ICON_MAP[activePresetDef.icon] : null;

  if (!isExpanded) {
    return (
      <button
        onClick={handleExpand}
        disabled={disabled}
        className="w-full text-left"
      >
        <Card className="transition-colors hover:bg-accent/50 cursor-pointer">
          <div className="px-4 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap min-w-0">
              <span className="flex items-center gap-1.5 font-medium text-sm">
                {activePresetDef && PresetIcon ? (
                  <>
                    <PresetIcon className="h-4 w-4" />
                    {activePresetDef.name}
                  </>
                ) : (
                  "Custom"
                )}
              </span>
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                • {selectedModels.length} model
                {selectedModels.length !== 1 ? "s" : ""} • {maxRounds} round
                {maxRounds !== 1 ? "s" : ""} • {consensusThreshold}%
                {enableSearch ? " • search" : ""}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
          </div>
        </Card>
      </button>
    );
  }

  return (
    <Card>
      <CardContent className="pt-3 space-y-3">
        {/* Header with Collapse */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide sm:hidden">
            Presets
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCollapse}
            disabled={disabled}
            className="shrink-0 ml-auto"
          >
            <ChevronUp className="h-4 w-4 sm:mr-1" />
            <span className="hidden sm:inline">Collapse</span>
          </Button>
        </div>

        {/* Preset Selector */}
        <PresetSelector
          activePreset={activePreset}
          onPresetSelect={onPresetSelect}
          disabled={disabled}
        />

        {/* Models Section */}
        <ModelsSection
          models={openRouterModels}
          groupedModels={openRouterGroupedModels}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          evaluatorModel={evaluatorModel}
          setEvaluatorModel={setEvaluatorModel}
          disabled={disabled}
          isLoading={openRouterLoading}
        />

        {/* Process Section */}
        <ProcessSection
          maxRounds={maxRounds}
          setMaxRounds={setMaxRounds}
          consensusThreshold={consensusThreshold}
          setConsensusThreshold={setConsensusThreshold}
          enableSearch={enableSearch}
          setEnableSearch={handleSearchToggle}
          hasTavilyKey={availableKeys.tavily}
          disabled={disabled}
        />
      </CardContent>
    </Card>
  );
}
