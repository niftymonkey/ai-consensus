/**
 * Preset definitions and model selection algorithms for AI Consensus
 */

import type { OpenRouterModelWithMeta } from "./openrouter-models";
import { isEvaluationSuitable } from "./openrouter-models";

// Purpose types for scoring models
export type Purpose = "casual" | "balanced" | "research" | "coding" | "creative";

// Preset IDs
export type PresetId = "casual" | "balanced" | "research" | "coding" | "creative";

/**
 * Preset definition - defines purpose and settings, models selected dynamically
 */
export interface PresetDefinition {
  id: PresetId;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  purpose: Purpose;
  modelCount: 2 | 3;
  maxRounds: number;
  consensusThreshold: number;
  enableSearch?: boolean;
}

/**
 * Resolved preset with actual model IDs
 */
export interface ResolvedPreset {
  preset: PresetDefinition;
  selectedModels: OpenRouterModelWithMeta[];
  evaluatorModel: OpenRouterModelWithMeta | null;
}

/**
 * Built-in preset definitions
 */
export const PRESETS: Record<PresetId, PresetDefinition> = {
  casual: {
    id: "casual",
    name: "Casual",
    description: "Fast answers from efficient models",
    icon: "Zap",
    purpose: "casual",
    modelCount: 2,
    maxRounds: 2,
    consensusThreshold: 80,
  },
  balanced: {
    id: "balanced",
    name: "Balanced",
    description: "Thoughtful analysis with diverse perspectives",
    icon: "Scale",
    purpose: "balanced",
    modelCount: 3,
    maxRounds: 3,
    consensusThreshold: 85,
  },
  research: {
    id: "research",
    name: "Research",
    description: "Maximum depth with flagship models",
    icon: "FlaskConical",
    purpose: "research",
    modelCount: 3,
    maxRounds: 5,
    consensusThreshold: 95,
    enableSearch: true,
  },
  coding: {
    id: "coding",
    name: "Coding",
    description: "Technical analysis for code and architecture",
    icon: "Code",
    purpose: "coding",
    modelCount: 2,
    maxRounds: 3,
    consensusThreshold: 90,
  },
  creative: {
    id: "creative",
    name: "Creative",
    description: "Imaginative collaboration with creative models",
    icon: "Sparkles",
    purpose: "creative",
    modelCount: 2,
    maxRounds: 3,
    consensusThreshold: 75,
  },
};

// Modality filter configuration
const EXCLUDED_OUTPUT_MODALITIES = ["image", "audio", "video"];

/**
 * Check if a model is text-focused (excludes image/audio/video output models).
 * Models that accept image input but only output text are included.
 */
export function isTextFocused(model: OpenRouterModelWithMeta): boolean {
  const outputs = model.architecture?.output_modalities || [];
  // Must output text and not output any excluded modalities
  return (
    outputs.includes("text") &&
    !outputs.some((m) => EXCLUDED_OUTPUT_MODALITIES.includes(m))
  );
}

/**
 * Extract and normalize version number from model id/name.
 * Returns normalized score: 5.2 -> 520, 5.1 -> 510, 5 -> 500, 4.5 -> 450
 *
 * Only matches semantic versions (X.Y), not:
 * - Date codes like "2512" or "0728"
 * - Model sizes like "8B", "70B", "8x22B"
 */
export function extractVersion(modelId: string): number {
  const lower = modelId.toLowerCase();

  // Skip if this looks like a model size pattern (NxMB like "8x22b", "8x7b")
  if (/\d+x\d+b/.test(lower)) {
    // Still try to find a real version in the name
    // e.g., "mixtral-8x22b-instruct" has no version, but "llama-3.1-8x22b" has 3.1
  }

  // First, try to match X.Y patterns (e.g., 5.2, 4.5, 3.7, 2.5)
  // But NOT followed by "b" (which indicates model size like "3.1b")
  // And NOT part of NxM pattern
  const dotMatch = lower.match(/(?<![x\d])(\d+)\.(\d+)(?!b)(?!x)/);
  if (dotMatch) {
    const major = parseInt(dotMatch[1], 10);
    const minor = parseInt(dotMatch[2], 10);
    // Sanity check: major version should be reasonable (1-9 for current models)
    if (major >= 1 && major <= 9) {
      return major * 100 + minor * 10;
    }
  }

  // For models like "gpt-5", "claude-4" - match single digit after hyphen
  // But NOT followed by digits, ".", "b", or "x" (model sizes like "8b", "8x7b", or versions like "3.5")
  const singleMatch = lower.match(/-([1-9])(?![0-9.bx])/);
  if (singleMatch) {
    return parseInt(singleMatch[1], 10) * 100;
  }

  // Special case for "o1", "o3", "o4" models (reasoning models)
  const oModelMatch = lower.match(/\bo([1-9])(?:-|$)/);
  if (oModelMatch) {
    return parseInt(oModelMatch[1], 10) * 100;
  }

  return 0;
}

/**
 * Determine model tier based on name/id patterns and pricing.
 * Returns: "flagship" | "standard" | "efficient"
 */
function getModelTier(model: OpenRouterModelWithMeta): "flagship" | "standard" | "efficient" {
  const id = model.id.toLowerCase();
  const name = model.shortName.toLowerCase();

  // Efficient tier indicators
  // Note: Use " mini" and "-mini" to avoid matching "gemini"
  const isEfficient =
    id.includes("-mini") ||
    id.includes("-nano") ||
    id.includes("-lite") ||
    id.includes("-flash") ||
    id.includes("haiku") ||
    name.includes(" mini") ||
    name.includes(" nano") ||
    name.includes(" lite") ||
    name.includes(" flash") ||
    name.includes("haiku");
  if (isEfficient) return "efficient";

  // Flagship tier indicators
  const flagshipPatterns = ["opus", "ultra"];
  const isFlagshipByName = flagshipPatterns.some(
    (pattern) => id.includes(pattern) || name.includes(pattern)
  );

  // "pro" is flagship unless it's in efficient context (already filtered above)
  // Check for "-pro" or "/gpt-5.2-pro" pattern
  const isProModel = id.includes("-pro") || name.includes(" pro");

  // Also consider high pricing as flagship indicator ($10+/M input)
  const isHighCost = model.costPerMillionInput >= 10;

  if (isFlagshipByName || isProModel || isHighCost) return "flagship";

  // Everything else is standard tier
  return "standard";
}

/**
 * Score a model for a given purpose.
 * Returns: PurposeScore + (VersionScore * 0.1)
 *
 * Purpose scoring:
 * - casual: efficient tier highest, flagship lowest
 * - balanced: standard tier highest
 * - research: flagship tier highest
 * - coding: standard tier with tool support highest
 * - creative: anthropic flagship highest, then other flagship
 */
export function scoreModelForPurpose(
  model: OpenRouterModelWithMeta,
  purpose: Purpose
): number {
  const tier = getModelTier(model);
  const versionScore = extractVersion(model.id);
  const provider = model.provider.toLowerCase();

  let purposeScore = 0;

  switch (purpose) {
    case "casual":
      // Prefer efficient models (speed/cost), flagship is overkill
      if (tier === "efficient") purposeScore = 100;
      else if (tier === "standard") purposeScore = 50;
      else purposeScore = 10; // flagship
      break;

    case "balanced":
      // Prefer standard tier for general reasoning
      if (tier === "standard") purposeScore = 100;
      else if (tier === "flagship") purposeScore = 50;
      else purposeScore = 10; // efficient
      break;

    case "research":
      // Prefer flagship for maximum depth
      if (tier === "flagship") purposeScore = 100;
      else if (tier === "standard") purposeScore = 50;
      else purposeScore = 10; // efficient
      break;

    case "coding":
      // Prefer standard tier with tool support
      if (tier === "standard") {
        purposeScore = model.supportsTools ? 100 : 80;
      } else if (tier === "flagship") {
        purposeScore = model.supportsTools ? 60 : 50;
      } else {
        purposeScore = 10; // efficient
      }
      break;

    case "creative":
      // Prefer Anthropic flagship (opus), then other flagship
      if (tier === "flagship") {
        if (provider === "anthropic") purposeScore = 120; // Extra bonus for Anthropic
        else purposeScore = 100;
      } else if (tier === "standard") {
        purposeScore = 50;
      } else {
        purposeScore = 10; // efficient
      }
      break;
  }

  // Add version as tiebreaker (0.1 multiplier)
  return purposeScore + versionScore * 0.1;
}

/**
 * Select the best models for a given purpose from available models.
 * Maximizes provider diversity while selecting top-scoring models.
 *
 * @param purpose - The purpose to optimize for
 * @param availableModels - Pool of available models
 * @param count - Number of models to select (2 or 3)
 * @returns Selected models sorted by score
 * @throws Error if fewer than 2 models available
 */
export function selectModelsForPreset(
  purpose: Purpose,
  availableModels: OpenRouterModelWithMeta[],
  count: 2 | 3 = 3
): OpenRouterModelWithMeta[] {
  // Filter to text-focused models only
  const textFocused = availableModels.filter(isTextFocused);

  if (textFocused.length < 2) {
    throw new Error(
      `Not enough models available for preset. Need at least 2, got ${textFocused.length}`
    );
  }

  // Score and sort all models
  const scored = textFocused
    .map((model) => ({
      model,
      score: scoreModelForPurpose(model, purpose),
    }))
    .sort((a, b) => b.score - a.score);

  // Select models with provider diversity
  const selected: OpenRouterModelWithMeta[] = [];
  const usedProviders = new Set<string>();

  // First pass: select top models with diverse providers
  for (const { model } of scored) {
    if (selected.length >= count) break;

    if (!usedProviders.has(model.provider)) {
      selected.push(model);
      usedProviders.add(model.provider);
    }
  }

  // Second pass: if we need more models, allow same provider
  if (selected.length < count && selected.length < textFocused.length) {
    for (const { model } of scored) {
      if (selected.length >= count) break;
      if (!selected.includes(model)) {
        selected.push(model);
      }
    }
  }

  // Ensure minimum of 2 models
  if (selected.length < 2) {
    throw new Error(
      `Could not select enough diverse models. Selected ${selected.length}, need at least 2`
    );
  }

  return selected;
}

/**
 * Select the best evaluator model for a given purpose.
 * Uses existing isEvaluationSuitable filter, then scores by purpose.
 *
 * @param purpose - The purpose to optimize for
 * @param availableModels - Pool of available models
 * @returns Best evaluator model, or null if none suitable
 */
export function selectEvaluatorForPreset(
  purpose: Purpose,
  availableModels: OpenRouterModelWithMeta[]
): OpenRouterModelWithMeta | null {
  // Filter to evaluation-suitable models
  const suitable = availableModels.filter(isEvaluationSuitable);

  if (suitable.length === 0) {
    return null;
  }

  // Score evaluators based on purpose
  // Research/Coding: Prefer flagship for thorough analysis
  // Casual: Standard is fine (balance speed/quality)
  // Creative: Prefer models known for nuanced assessment
  const scored = suitable
    .map((model) => ({
      model,
      score: scoreModelForPurpose(model, purpose),
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0].model;
}

/**
 * Resolve a preset to actual models based on availability.
 *
 * @param presetId - The preset to resolve
 * @param availableModels - Pool of available models
 * @returns Resolved preset with selected models and evaluator
 */
export function resolvePreset(
  presetId: PresetId,
  availableModels: OpenRouterModelWithMeta[]
): ResolvedPreset {
  const preset = PRESETS[presetId];

  const selectedModels = selectModelsForPreset(
    preset.purpose,
    availableModels,
    preset.modelCount
  );

  const evaluatorModel = selectEvaluatorForPreset(preset.purpose, availableModels);

  return {
    preset,
    selectedModels,
    evaluatorModel,
  };
}
