/**
 * Model Filtering Logic
 *
 * Pure functions for filtering available models based on API keys
 * and validating model selections.
 */

import { canAccessModel, type KeySet } from "./model-routing";

// Re-export KeySet for convenience
export type { KeySet } from "./model-routing";

/**
 * Minimal model representation for filtering
 */
export interface Model {
  /** OpenRouter format ID (e.g., "openai/gpt-4o") */
  id: string;
  /** Provider name (e.g., "openai") */
  provider: string;
  /** Display name */
  name: string;
}

/**
 * Model selection from the UI
 */
export interface ModelSelection {
  /** Unique selection ID (e.g., "model-1") */
  id: string;
  /** Model ID in OpenRouter format */
  modelId: string;
  /** Provider name */
  provider: string;
  /** Display label */
  label: string;
}

/**
 * Filter models to only those accessible with the given keys.
 *
 * Rules:
 * - If OpenRouter key exists: all models are accessible
 * - If only direct keys exist: only models from those providers
 * - If no keys: no models accessible
 *
 * @param models - Full list of available models
 * @param keys - Available API keys
 * @returns Filtered list of accessible models
 */
export function filterAvailableModels(models: Model[], keys: KeySet): Model[] {
  return models.filter((model) => canAccessModel(model.id, keys));
}

/**
 * Validate model selections against available models.
 * Removes any selections that are no longer available.
 *
 * Use case: When user removes an API key, their previously selected
 * models may no longer be accessible. This function cleans up the selection.
 *
 * @param selections - Current model selections from UI state
 * @param available - Currently available models (already filtered by keys)
 * @returns Selections that are still valid
 */
export function validateModelSelections(
  selections: ModelSelection[],
  available: Model[]
): ModelSelection[] {
  const availableIds = new Set(available.map((m) => m.id));
  return selections.filter((selection) => availableIds.has(selection.modelId));
}
