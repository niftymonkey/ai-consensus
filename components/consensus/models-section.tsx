"use client";

import { useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UnifiedModelSelector } from "./unified-model-selector";
import { ModelCombobox } from "@/components/ui/model-combobox";
import type { ModelSelection } from "@/lib/types";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";
import { groupModelsByProvider, getRecommendedEvaluatorModels } from "@/lib/openrouter-models";

interface ModelsSectionProps {
  models: OpenRouterModelWithMeta[];
  groupedModels: Record<string, OpenRouterModelWithMeta[]>;
  selectedModels: ModelSelection[];
  setSelectedModels: (models: ModelSelection[]) => void;
  evaluatorModel: string;
  setEvaluatorModel: (value: string) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function ModelsSection({
  models,
  groupedModels,
  selectedModels,
  setSelectedModels,
  evaluatorModel,
  setEvaluatorModel,
  disabled = false,
  isLoading = false,
}: ModelsSectionProps) {
  // Filter evaluator models (exclude nano/mini/lite/flash)
  const evaluatorModels = useMemo(() => {
    return models.filter((m) => {
      const lower = m.shortName.toLowerCase();
      return (
        !lower.includes("nano") &&
        !lower.includes(" mini") &&
        !lower.includes("-mini") &&
        !lower.includes("lite") &&
        !lower.includes("flash") &&
        !lower.includes("tiny") &&
        !lower.includes("small")
      );
    });
  }, [models]);

  const groupedEvaluatorModels = useMemo(
    () => groupModelsByProvider(evaluatorModels),
    [evaluatorModels]
  );

  const recommendedEvaluatorIds = useMemo(
    () => getRecommendedEvaluatorModels(models),
    [models]
  );

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Models
      </h3>
      <div className="space-y-3">
        {/* Participating Models */}
        <UnifiedModelSelector
          models={models}
          groupedModels={groupedModels}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          disabled={disabled}
          isLoading={isLoading}
        />

        {/* Evaluator Model */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Evaluator Model</CardTitle>
            <CardDescription>
              Judges consensus between responses and synthesizes the final answer.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <ModelCombobox
              models={evaluatorModels}
              groupedModels={groupedEvaluatorModels}
              value={evaluatorModel}
              onValueChange={setEvaluatorModel}
              placeholder="Select evaluator model..."
              disabled={disabled || evaluatorModels.length === 0}
              recommendedIds={recommendedEvaluatorIds}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
