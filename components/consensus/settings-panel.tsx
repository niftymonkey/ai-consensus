"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ChevronDown, ChevronUp, Settings as SettingsIcon } from "lucide-react";
import Link from "next/link";
import { UnifiedModelSelector } from "./unified-model-selector";
import { ConsensusSettings } from "./consensus-settings";
import type { ModelSelection } from "@/lib/types";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";

interface AvailableKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
  tavily: boolean;
  openrouter: boolean;
}

interface ConsensusPreferences {
  models: Array<{provider: string, modelId: string, label: string}>;
  maxRounds: number;
  threshold: number;
  evaluatorModel: string;
  enableSearch: boolean;
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
  // OpenRouter models for the unified model selector
  openRouterModels: OpenRouterModelWithMeta[];
  openRouterGroupedModels: Record<string, OpenRouterModelWithMeta[]>;
  openRouterLoading?: boolean;
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
  openRouterModels,
  openRouterGroupedModels,
  openRouterLoading = false,
}: SettingsPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [hasLoadedPreferences, setHasLoadedPreferences] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    if (hasLoadedPreferences) return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const prefs: ConsensusPreferences = JSON.parse(stored);

        // Restore model selections
        if (prefs.models && prefs.models.length >= 2) {
          const restoredModels: ModelSelection[] = prefs.models.map((m, idx) => ({
            id: `model-${idx + 1}`,
            provider: m.provider as "anthropic" | "openai" | "google",
            modelId: m.modelId,
            label: m.label,
          }));
          setSelectedModels(restoredModels);
        }

        // Restore other settings
        setMaxRounds(prefs.maxRounds);
        setConsensusThreshold(prefs.threshold);
        setEvaluatorModel(prefs.evaluatorModel);
        // Only restore enableSearch if Tavily key is still available
        if (prefs.enableSearch !== undefined && availableKeys.tavily) {
          setEnableSearch(prefs.enableSearch);
        }

        // Collapse by default if preferences exist
        setIsExpanded(false);
      }

      setHasLoadedPreferences(true);
    } catch (error) {
      console.error("Failed to load consensus preferences:", error);
      setHasLoadedPreferences(true);
    }
  }, [hasLoadedPreferences]);

  // Save preferences to localStorage
  const savePreferences = useCallback(() => {
    try {
      const prefs: ConsensusPreferences = {
        models: selectedModels.map(m => ({
          provider: m.provider,
          modelId: m.modelId,
          label: m.label,
        })),
        maxRounds,
        threshold: consensusThreshold,
        evaluatorModel,
        enableSearch,
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch (error) {
      console.error("Failed to save consensus preferences:", error);
    }
  }, [selectedModels, maxRounds, consensusThreshold, evaluatorModel, enableSearch]);

  // Auto-save preferences when settings change (debounced)
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Don't auto-save until initial preferences have been loaded
    if (!hasLoadedPreferences) return;

    // Clear any pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Debounce save by 300ms
    saveTimeoutRef.current = setTimeout(() => {
      savePreferences();
    }, 300);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [selectedModels, maxRounds, consensusThreshold, evaluatorModel, enableSearch, hasLoadedPreferences, savePreferences]);

  // Generate summary text for collapsed state
  const getSummary = () => {
    const modelCount = selectedModels.length;
    const searchStatus = enableSearch ? 'search on' : 'search off';
    return `${modelCount} model${modelCount !== 1 ? 's' : ''}, ${maxRounds} round${maxRounds !== 1 ? 's' : ''}, ${consensusThreshold}% threshold, ${searchStatus}`;
  };

  if (!isExpanded) {
    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              <CardTitle className="text-base">Settings</CardTitle>
              <span className="text-sm text-muted-foreground">({getSummary()})</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              disabled={disabled}
            >
              <ChevronDown className="h-4 w-4 mr-1" />
              Expand
            </Button>
          </div>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SettingsIcon className="h-5 w-5" />
            <CardTitle>Settings</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(false)}
            disabled={disabled}
          >
            <ChevronUp className="h-4 w-4 mr-1" />
            Collapse
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <UnifiedModelSelector
            models={openRouterModels}
            groupedModels={openRouterGroupedModels}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            disabled={disabled}
            isLoading={openRouterLoading}
          />

          <ConsensusSettings
            maxRounds={maxRounds}
            setMaxRounds={setMaxRounds}
            consensusThreshold={consensusThreshold}
            setConsensusThreshold={setConsensusThreshold}
            evaluatorModel={evaluatorModel}
            setEvaluatorModel={setEvaluatorModel}
            openRouterModels={openRouterModels}
            disabled={disabled}
          />
        </div>

        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="enable-search">Enable Web Search</Label>
            <p className="text-xs text-muted-foreground">
              {availableKeys.tavily ? (
                "Provides models with current web information"
              ) : (
                <>
                  <Link href="/settings" className="underline">
                    Add Tavily API key
                  </Link>{" "}
                  to enable
                </>
              )}
            </p>
          </div>
          <Switch
            id="enable-search"
            checked={enableSearch}
            onCheckedChange={setEnableSearch}
            disabled={disabled || !availableKeys.tavily}
          />
        </div>
      </CardContent>
    </Card>
  );
}
