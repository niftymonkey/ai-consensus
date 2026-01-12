/**
 * Trial preset configuration
 *
 * A special preset for trial users that uses only trial-allowed models
 * with constraints from the trial config.
 */

import { TRIAL_CONFIG, TRIAL_ALLOWED_MODELS } from "./config/trial";
import type { OpenRouterModelWithMeta } from "./openrouter-models";

export const TRIAL_PRESET_ID = "trial" as const;

export interface TrialPresetDefinition {
  id: typeof TRIAL_PRESET_ID;
  name: string;
  description: string;
  icon: string;
  modelCount: 2;
  maxRounds: number;
  consensusThreshold: number;
  allowedModelIds: readonly string[];
}

/**
 * The trial preset definition
 */
export const TRIAL_PRESET: TrialPresetDefinition = {
  id: TRIAL_PRESET_ID,
  name: "Try Free",
  description: `${TRIAL_CONFIG.maxRuns} free runs with efficient models`,
  icon: "Gift",
  modelCount: 2,
  maxRounds: TRIAL_CONFIG.maxRounds,
  consensusThreshold: 80,
  allowedModelIds: TRIAL_ALLOWED_MODELS,
};

/**
 * Resolve trial preset with actual models from available pool
 */
export function resolveTrialPreset(
  availableModels: OpenRouterModelWithMeta[]
): {
  preset: TrialPresetDefinition;
  selectedModels: OpenRouterModelWithMeta[];
  evaluatorModel: OpenRouterModelWithMeta | null;
} {
  // Filter to only trial-allowed models
  const trialModels = availableModels.filter((model) =>
    TRIAL_ALLOWED_MODELS.includes(model.id as typeof TRIAL_ALLOWED_MODELS[number])
  );

  // Select up to 2 models, preferring diversity
  const selectedModels: OpenRouterModelWithMeta[] = [];
  const usedProviders = new Set<string>();

  for (const model of trialModels) {
    if (selectedModels.length >= 2) break;
    if (!usedProviders.has(model.provider)) {
      selectedModels.push(model);
      usedProviders.add(model.provider);
    }
  }

  // If we need more models, allow same provider
  if (selectedModels.length < 2) {
    for (const model of trialModels) {
      if (selectedModels.length >= 2) break;
      if (!selectedModels.includes(model)) {
        selectedModels.push(model);
      }
    }
  }

  // Use first model as evaluator (trial models are all capable)
  const evaluatorModel = selectedModels[0] || null;

  return {
    preset: TRIAL_PRESET,
    selectedModels,
    evaluatorModel,
  };
}

/**
 * Check if a preset ID is the trial preset
 */
export function isTrialPreset(presetId: string): presetId is typeof TRIAL_PRESET_ID {
  return presetId === TRIAL_PRESET_ID;
}
