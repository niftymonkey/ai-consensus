"use client";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { X, Plus } from "lucide-react";
import type { ModelSelection } from "@/lib/types";
import { AVAILABLE_MODELS } from "@/lib/types";

interface ModelSelectorProps {
  availableKeys: {
    anthropic: boolean;
    openai: boolean;
    google: boolean;
  };
  selectedModels: ModelSelection[];
  setSelectedModels: (models: ModelSelection[]) => void;
  disabled?: boolean;
}

export function ModelSelector({
  availableKeys,
  selectedModels,
  setSelectedModels,
  disabled = false,
}: ModelSelectorProps) {
  function addModel() {
    if (selectedModels.length >= 3) return;

    // Find first available provider
    const provider =
      availableKeys.anthropic ? "anthropic" :
      availableKeys.openai ? "openai" :
      availableKeys.google ? "google" : null;

    if (!provider) return;

    const newModel: ModelSelection = {
      id: `model-${selectedModels.length + 1}`,
      provider,
      modelId: AVAILABLE_MODELS[provider][0].modelId,
      label: AVAILABLE_MODELS[provider][0].label,
    };

    setSelectedModels([...selectedModels, newModel]);
  }

  function removeModel(id: string) {
    setSelectedModels(selectedModels.filter((m) => m.id !== id));
  }

  function updateModel(
    id: string,
    updates: { provider?: ModelSelection["provider"]; modelId?: string; label?: string }
  ) {
    setSelectedModels(
      selectedModels.map((m) => {
        if (m.id !== id) return m;

        // If provider changed, reset modelId and label
        if (updates.provider && updates.provider !== m.provider) {
          return {
            ...m,
            provider: updates.provider,
            modelId: AVAILABLE_MODELS[updates.provider][0].modelId,
            label: AVAILABLE_MODELS[updates.provider][0].label,
          };
        }

        return { ...m, ...updates };
      })
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Model Selection</CardTitle>
        <CardDescription>
          Select 2-3 AI models to compare. Models can be from the same or different providers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {selectedModels.map((model, index) => (
          <div key={model.id} className="flex items-center gap-4">
            <div className="flex-1 grid grid-cols-2 gap-4">
              {/* Provider Selection */}
              <Select
                value={model.provider}
                onValueChange={(provider: ModelSelection["provider"]) =>
                  updateModel(model.id, { provider })
                }
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableKeys.anthropic && (
                    <SelectItem value="anthropic">Anthropic</SelectItem>
                  )}
                  {availableKeys.openai && (
                    <SelectItem value="openai">OpenAI</SelectItem>
                  )}
                  {availableKeys.google && (
                    <SelectItem value="google">Google</SelectItem>
                  )}
                </SelectContent>
              </Select>

              {/* Model Selection */}
              <Select
                value={model.modelId}
                onValueChange={(modelId) => {
                  const selectedOption = AVAILABLE_MODELS[model.provider].find(
                    (m) => m.modelId === modelId
                  );
                  if (selectedOption) {
                    updateModel(model.id, {
                      modelId: selectedOption.modelId,
                      label: selectedOption.label,
                    });
                  }
                }}
                disabled={disabled}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AVAILABLE_MODELS[model.provider].map((option) => (
                    <SelectItem key={option.modelId} value={option.modelId}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
            disabled={disabled}
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
