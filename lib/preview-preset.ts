/**
 * Preview preset configuration
 *
 * A special preset for preview users that uses only preview-allowed models
 * with constraints from the preview config.
 */

import { PREVIEW_CONFIG, PREVIEW_ALLOWED_MODELS } from "./config/preview";
import type { OpenRouterModelWithMeta } from "./openrouter-models";

export const PREVIEW_PRESET_ID = "preview" as const;

export interface PreviewPresetDefinition {
  id: typeof PREVIEW_PRESET_ID;
  name: string;
  description: string;
  icon: string;
  modelCount: 2;
  maxRounds: number;
  consensusThreshold: number;
  allowedModelIds: readonly string[];
}

/**
 * The preview preset definition
 */
export const PREVIEW_PRESET: PreviewPresetDefinition = {
  id: PREVIEW_PRESET_ID,
  name: "Preview",
  description: `${PREVIEW_CONFIG.maxRuns} free runs with efficient models`,
  icon: "Gift",
  modelCount: 2,
  maxRounds: PREVIEW_CONFIG.maxRounds,
  consensusThreshold: 80,
  allowedModelIds: PREVIEW_ALLOWED_MODELS,
};

/**
 * Resolve preview preset with actual models from available pool
 */
export function resolvePreviewPreset(
  availableModels: OpenRouterModelWithMeta[]
): {
  preset: PreviewPresetDefinition;
  selectedModels: OpenRouterModelWithMeta[];
  evaluatorModel: OpenRouterModelWithMeta | null;
} {
  // Filter to only preview-allowed models
  const previewModels = availableModels.filter((model) =>
    PREVIEW_ALLOWED_MODELS.includes(model.id as typeof PREVIEW_ALLOWED_MODELS[number])
  );

  // Select up to 2 models, preferring diversity
  const selectedModels: OpenRouterModelWithMeta[] = [];
  const usedProviders = new Set<string>();

  for (const model of previewModels) {
    if (selectedModels.length >= 2) break;
    if (!usedProviders.has(model.provider)) {
      selectedModels.push(model);
      usedProviders.add(model.provider);
    }
  }

  // If we need more models, allow same provider
  if (selectedModels.length < 2) {
    for (const model of previewModels) {
      if (selectedModels.length >= 2) break;
      if (!selectedModels.includes(model)) {
        selectedModels.push(model);
      }
    }
  }

  // Use first model as evaluator (preview models are all capable)
  const evaluatorModel = selectedModels[0] || null;

  return {
    preset: PREVIEW_PRESET,
    selectedModels,
    evaluatorModel,
  };
}

/**
 * Check if a preset ID is the preview preset
 */
export function isPreviewPreset(presetId: string): presetId is typeof PREVIEW_PRESET_ID {
  return presetId === PREVIEW_PRESET_ID;
}
