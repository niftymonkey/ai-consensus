"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import { ModelCombobox } from "@/components/ui/model-combobox";
import posthog from "posthog-js";
import type { ModelSelection } from "@/lib/types";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";

interface UnifiedModelSelectorProps {
  models: OpenRouterModelWithMeta[];
  groupedModels: Record<string, OpenRouterModelWithMeta[]>;
  selectedModels: ModelSelection[];
  setSelectedModels: (models: ModelSelection[]) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export function UnifiedModelSelector({
  models,
  groupedModels,
  selectedModels,
  setSelectedModels,
  disabled = false,
  isLoading = false,
}: UnifiedModelSelectorProps) {
  function addModel() {
    if (selectedModels.length >= 3) return;
    if (models.length === 0) return;

    // Find a model that isn't already selected
    const usedModelIds = new Set(selectedModels.map((m) => m.modelId));
    const availableModel = models.find((m) => !usedModelIds.has(m.id));

    if (!availableModel) return;

    const newModel: ModelSelection = {
      id: `model-${Date.now()}`,
      provider: availableModel.provider as ModelSelection["provider"],
      modelId: availableModel.id,
      label: availableModel.shortName,
    };

    // Track model added
    posthog.capture("model_added", {
      model_id: availableModel.id,
      provider: availableModel.provider,
      model_count: selectedModels.length + 1,
    });

    setSelectedModels([...selectedModels, newModel]);
  }

  function removeModel(id: string) {
    const removedModel = selectedModels.find((m) => m.id === id);
    if (removedModel) {
      // Track model removed
      posthog.capture("model_removed", {
        model_id: removedModel.modelId,
        provider: removedModel.provider,
        model_count: selectedModels.length - 1,
      });
    }
    setSelectedModels(selectedModels.filter((m) => m.id !== id));
  }

  function updateModel(id: string, openRouterModelId: string) {
    const model = models.find((m) => m.id === openRouterModelId);
    if (!model) return;

    setSelectedModels(
      selectedModels.map((m) => {
        if (m.id !== id) return m;
        return {
          ...m,
          provider: model.provider as ModelSelection["provider"],
          modelId: model.id,
          label: model.shortName,
        };
      })
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Selection</CardTitle>
        <CardDescription>
          Select 2-3 AI models to compare. Search or browse by provider.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedModels.map((model, index) => (
          <div key={model.id} className="flex items-center gap-4">
            <div className="flex-1">
              <ModelCombobox
                models={models}
                groupedModels={groupedModels}
                value={model.modelId}
                onValueChange={(modelId) => updateModel(model.id, modelId)}
                placeholder={`Select model ${index + 1}...`}
                disabled={disabled}
                isLoading={isLoading}
              />
            </div>

            {/* Remove Button */}
            {selectedModels.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeModel(model.id)}
                disabled={disabled}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}

        {/* Add Model Button */}
        {selectedModels.length < 3 && (
          <Button
            variant="outline"
            onClick={addModel}
            disabled={disabled || isLoading || models.length === 0}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Model {selectedModels.length === 0 ? "(minimum 2)" : ""}
          </Button>
        )}

        {selectedModels.length < 2 && (
          <p className="text-sm text-muted-foreground">
            Please select at least 2 models to continue
          </p>
        )}
      </CardContent>
    </Card>
  );
}
