"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, Settings as SettingsIcon } from "lucide-react";
import { ModelSelector } from "./model-selector";
import { ConsensusSettings } from "./consensus-settings";
import type { ModelSelection } from "@/lib/types";
import type { ProviderModels } from "@/lib/models";

interface AvailableKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
}

interface ConsensusPreferences {
  models: Array<{provider: string, modelId: string, label: string}>;
  maxRounds: number;
  threshold: number;
  evaluatorModel: string;
  lastUpdated: number;
}

interface SettingsPanelProps {
  availableKeys: AvailableKeys;
  availableModels: ProviderModels;
  selectedModels: ModelSelection[];
  setSelectedModels: (models: ModelSelection[]) => void;
  maxRounds: number;
  setMaxRounds: (value: number) => void;
  consensusThreshold: number;
  setConsensusThreshold: (value: number) => void;
  evaluatorModel: string;
  setEvaluatorModel: (value: string) => void;
  disabled?: boolean;
}

const STORAGE_KEY = "consensusPreferences";

export function SettingsPanel({
  availableKeys,
  availableModels,
  selectedModels,
  setSelectedModels,
  maxRounds,
  setMaxRounds,
  consensusThreshold,
  setConsensusThreshold,
  evaluatorModel,
  setEvaluatorModel,
  disabled = false,
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

        // Collapse by default if preferences exist
        setIsExpanded(false);
      }

      setHasLoadedPreferences(true);
    } catch (error) {
      console.error("Failed to load consensus preferences:", error);
      setHasLoadedPreferences(true);
    }
  }, [hasLoadedPreferences]);

  // Save preferences
  const savePreferences = () => {
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
        lastUpdated: Date.now(),
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
      setIsExpanded(false);
    } catch (error) {
      console.error("Failed to save consensus preferences:", error);
      alert("Failed to save preferences");
    }
  };

  // Generate summary text for collapsed state
  const getSummary = () => {
    const modelCount = selectedModels.length;
    return `${modelCount} model${modelCount !== 1 ? 's' : ''}, ${maxRounds} round${maxRounds !== 1 ? 's' : ''}, ${consensusThreshold}% threshold`;
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
          <ModelSelector
            availableKeys={availableKeys}
            availableModels={availableModels}
            selectedModels={selectedModels}
            setSelectedModels={setSelectedModels}
            disabled={disabled}
          />

          <ConsensusSettings
            maxRounds={maxRounds}
            setMaxRounds={setMaxRounds}
            consensusThreshold={consensusThreshold}
            setConsensusThreshold={setConsensusThreshold}
            evaluatorModel={evaluatorModel}
            setEvaluatorModel={setEvaluatorModel}
            availableModels={availableModels}
            disabled={disabled}
          />
        </div>

        <div className="flex justify-end">
          <Button
            onClick={savePreferences}
            disabled={disabled || selectedModels.length < 2}
          >
            Use These Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
