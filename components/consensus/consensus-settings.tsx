"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { ModelCombobox } from "@/components/ui/model-combobox";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";
import { groupModelsByProvider, getRecommendedEvaluatorModels } from "@/lib/openrouter-models";

interface ConsensusSettingsProps {
  maxRounds: number;
  setMaxRounds: (value: number) => void;
  consensusThreshold: number;
  setConsensusThreshold: (value: number) => void;
  evaluatorModel: string;
  setEvaluatorModel: (value: string) => void;
  openRouterModels: OpenRouterModelWithMeta[];
  disabled?: boolean;
}

export function ConsensusSettings({
  maxRounds,
  setMaxRounds,
  consensusThreshold,
  setConsensusThreshold,
  evaluatorModel,
  setEvaluatorModel,
  openRouterModels,
  disabled = false,
}: ConsensusSettingsProps) {
  // Filter out nano/mini/lite/flash models - keep only evaluation-suitable models
  const evaluatorModels = useMemo(() => {
    return openRouterModels.filter(m => {
      const lower = m.shortName.toLowerCase();
      return !lower.includes('nano') &&
             !lower.includes(' mini') &&
             !lower.includes('-mini') &&
             !lower.includes('lite') &&
             !lower.includes('flash') &&
             !lower.includes('tiny') &&
             !lower.includes('small');
    });
  }, [openRouterModels]);

  const groupedEvaluatorModels = useMemo(
    () => groupModelsByProvider(evaluatorModels),
    [evaluatorModels]
  );

  // Get dynamically computed recommended evaluator model IDs
  // Prefers latest versions and ensures provider diversity
  const recommendedIds = useMemo(
    () => getRecommendedEvaluatorModels(openRouterModels),
    [openRouterModels]
  );

  return (
    <Card>
        <CardHeader>
          <CardTitle>Consensus Settings</CardTitle>
          <CardDescription>
            Configure how models will refine their responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Rounds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-rounds">Maximum Rounds</Label>
              <span className="text-sm font-medium">{maxRounds}</span>
            </div>
            <Slider
              id="max-rounds"
              min={1}
              max={10}
              step={1}
              value={[maxRounds]}
              onValueChange={([value]) => setMaxRounds(value)}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Models will refine their responses up to {maxRounds} time{maxRounds > 1 ? "s" : ""}
            </p>
          </div>

          {/* Consensus Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="consensus-threshold">Consensus Threshold</Label>
              <span className="text-sm font-medium">{consensusThreshold}%</span>
            </div>
            <Slider
              id="consensus-threshold"
              min={60}
              max={95}
              step={1}
              value={[consensusThreshold]}
              onValueChange={([value]) => setConsensusThreshold(value)}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Consensus score must reach {consensusThreshold}% to stop early
            </p>
          </div>

          {/* Evaluator Model */}
          <div className="space-y-2">
            <Label>Evaluator Model</Label>
            <ModelCombobox
              models={evaluatorModels}
              groupedModels={groupedEvaluatorModels}
              value={evaluatorModel}
              onValueChange={setEvaluatorModel}
              placeholder="Select evaluator model..."
              disabled={disabled || evaluatorModels.length === 0}
              recommendedIds={recommendedIds}
            />
            <p className="text-xs text-muted-foreground">
              This model evaluates consensus and synthesizes the final response
            </p>
          </div>
        </CardContent>
      </Card>
  );
}
