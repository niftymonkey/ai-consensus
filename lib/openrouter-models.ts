/**
 * Fetch and cache OpenRouter model catalog
 */

export interface OpenRouterModel {
  id: string;
  name: string;
  description: string;
  context_length: number;
  pricing: {
    prompt: string;
    completion: string;
  };
  architecture: {
    modality: string;
    input_modalities: string[];
    output_modalities: string[];
  };
  top_provider: {
    context_length: number;
    max_completion_tokens: number | null;
    is_moderated: boolean;
  };
  supported_parameters: string[];
}

export interface OpenRouterModelWithMeta extends OpenRouterModel {
  // Computed fields
  provider: string; // Extracted from id (e.g., "meta-llama" from "meta-llama/llama-3.1-70b")
  shortName: string; // Model name without provider prefix
  costPerMillionInput: number;
  costPerMillionOutput: number;
  isFree: boolean;
  supportsTools: boolean;
  isTextOnly: boolean;
}

// Cache for models (server-side, refreshed periodically)
let modelCache: OpenRouterModelWithMeta[] | null = null;
let cacheTimestamp: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Extract provider name from model ID
 * e.g., "meta-llama/llama-3.1-70b-instruct" -> "meta-llama"
 */
function extractProvider(modelId: string): string {
  const parts = modelId.split("/");
  return parts[0] || "unknown";
}

/**
 * Extract short name from full model name
 * e.g., "Meta: Llama 3.1 70B Instruct" -> "Llama 3.1 70B Instruct"
 */
function extractShortName(name: string): string {
  // Remove provider prefix like "Meta: ", "OpenAI: ", etc.
  const colonIndex = name.indexOf(": ");
  if (colonIndex > 0 && colonIndex < 30) {
    return name.substring(colonIndex + 2);
  }
  return name;
}

/**
 * Parse pricing string to number (cost per million tokens)
 */
function parsePricing(price: string): number {
  const num = parseFloat(price);
  if (isNaN(num)) return 0;
  // OpenRouter returns price per token, convert to per million
  return num * 1_000_000;
}

/**
 * Process raw OpenRouter model into our enriched format
 */
function processModel(model: OpenRouterModel): OpenRouterModelWithMeta {
  const costPerMillionInput = parsePricing(model.pricing.prompt);
  const costPerMillionOutput = parsePricing(model.pricing.completion);

  return {
    ...model,
    provider: extractProvider(model.id),
    shortName: extractShortName(model.name),
    costPerMillionInput,
    costPerMillionOutput,
    isFree: costPerMillionInput === 0 && costPerMillionOutput === 0,
    supportsTools: model.supported_parameters?.includes("tools") ?? false,
    isTextOnly: model.architecture?.modality === "text->text",
  };
}

/**
 * Fetch models from OpenRouter API
 */
export async function fetchOpenRouterModels(): Promise<OpenRouterModelWithMeta[]> {
  // Check cache
  const now = Date.now();
  if (modelCache && now - cacheTimestamp < CACHE_DURATION_MS) {
    return modelCache;
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        "Content-Type": "application/json",
      },
      // Cache for 5 minutes
      next: { revalidate: 300 },
    });

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    const models: OpenRouterModel[] = data.data || [];

    // Filter to only text-capable models and process
    const processed = models
      .filter((m) => m.architecture?.output_modalities?.includes("text"))
      .map(processModel)
      .sort((a, b) => a.name.localeCompare(b.name));

    // Update cache
    modelCache = processed;
    cacheTimestamp = now;

    return processed;
  } catch (error) {
    console.error("Failed to fetch OpenRouter models:", error);
    // Return cached data if available, even if stale
    if (modelCache) {
      return modelCache;
    }
    throw error;
  }
}

/**
 * Get unique providers from model list
 */
export function getProviders(models: OpenRouterModelWithMeta[]): string[] {
  const providers = new Set(models.map((m) => m.provider));
  return Array.from(providers).sort();
}

/**
 * Group models by provider
 */
export function groupModelsByProvider(
  models: OpenRouterModelWithMeta[]
): Record<string, OpenRouterModelWithMeta[]> {
  const groups: Record<string, OpenRouterModelWithMeta[]> = {};

  for (const model of models) {
    if (!groups[model.provider]) {
      groups[model.provider] = [];
    }
    groups[model.provider].push(model);
  }

  // Sort models within each group
  for (const provider of Object.keys(groups)) {
    groups[provider].sort((a, b) => a.shortName.localeCompare(b.shortName));
  }

  return groups;
}

/**
 * Format provider name for display
 * e.g., "meta-llama" -> "Meta Llama", "openai" -> "OpenAI"
 */
export function formatProviderName(provider: string): string {
  const specialCases: Record<string, string> = {
    openai: "OpenAI",
    anthropic: "Anthropic",
    google: "Google",
    "meta-llama": "Meta Llama",
    mistralai: "Mistral AI",
    deepseek: "DeepSeek",
    cohere: "Cohere",
    perplexity: "Perplexity",
    "x-ai": "xAI",
    nvidia: "NVIDIA",
    amazon: "Amazon",
    microsoft: "Microsoft",
  };

  if (specialCases[provider]) {
    return specialCases[provider];
  }

  // Default: capitalize each word
  return provider
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Format cost for display
 */
export function formatCost(costPerMillion: number): string {
  if (costPerMillion === 0) return "Free";
  if (costPerMillion < 0.01) return "<$0.01/M";
  if (costPerMillion < 1) return `$${costPerMillion.toFixed(2)}/M`;
  return `$${costPerMillion.toFixed(1)}/M`;
}

/**
 * Convert curated models to OpenRouterModelWithMeta format
 * This allows using the same combobox UI for both direct keys and OpenRouter
 */
export function convertCuratedToOpenRouterFormat(
  curatedModels: Array<{
    id: string;
    name: string;
    description?: string;
    contextWindow?: number;
    pricing?: { input: number; output: number };
    provider?: string;
  }>,
  provider: string
): OpenRouterModelWithMeta[] {
  return curatedModels.map((model) => ({
    id: model.id,
    name: `${formatProviderName(provider)}: ${model.name}`,
    description: model.description || "",
    context_length: model.contextWindow || 128000,
    pricing: {
      prompt: model.pricing ? String(model.pricing.input / 1_000_000) : "0",
      completion: model.pricing ? String(model.pricing.output / 1_000_000) : "0",
    },
    architecture: {
      modality: "text->text",
      input_modalities: ["text"],
      output_modalities: ["text"],
    },
    top_provider: {
      context_length: model.contextWindow || 128000,
      max_completion_tokens: null,
      is_moderated: false,
    },
    supported_parameters: ["tools"],
    provider,
    shortName: model.name,
    costPerMillionInput: model.pricing?.input || 0,
    costPerMillionOutput: model.pricing?.output || 0,
    isFree: !model.pricing || (model.pricing.input === 0 && model.pricing.output === 0),
    supportsTools: true,
    isTextOnly: true,
  }));
}

/**
 * Score a model for evaluation suitability.
 * Higher scores = better for evaluation tasks.
 *
 * Positive signals:
 * - Tool support (better structured output)
 * - Large context (32K+)
 * - "Latest" versions
 * - Higher version numbers
 * - "Pro" variants
 *
 * Negative signals:
 * - Dated snapshots
 */
function getVersionScore(model: OpenRouterModelWithMeta): number {
  const name = model.shortName.toLowerCase();
  const id = model.id.toLowerCase();

  let score = 0;

  // Positive: Tool support (better at structured JSON output)
  if (model.supportsTools) {
    score += 50;
  }

  // Positive: Large context (handles multiple long responses)
  if (model.context_length >= 32000) {
    score += 30;
  } else if (model.context_length >= 16000) {
    score += 15;
  }

  // Strong preference for "latest" variants
  if (name.includes("latest") || id.includes("latest")) {
    score += 100;
  }

  // Penalize dated versions (e.g., "2024-10-22")
  if (/\d{4}-\d{2}-\d{2}/.test(id) || /\d{4}-\d{2}-\d{2}/.test(name)) {
    score -= 50;
  }

  // Penalize specific date suffixes (e.g., "20241022")
  if (/\d{8}/.test(id)) {
    score -= 50;
  }

  // Prefer higher version numbers (e.g., "4" over "3.5")
  const versionMatch = name.match(/(\d+(?:\.\d+)?)/);
  if (versionMatch) {
    score += parseFloat(versionMatch[1]) * 10;
  }

  // Slight preference for models with "pro" in name (usually more capable)
  if (name.includes("pro") && !name.includes("preview")) {
    score += 5;
  }

  return score;
}

/**
 * Check if a model is suitable for evaluation tasks.
 * Uses strict filtering to ensure only capable models are recommended.
 *
 * Negative filters (exclude):
 * - Lightweight: haiku, mini, flash, nano, lite, tiny, small
 * - Code-specialized: code, coder, codex
 * - Vision-specialized: vision, -vl, omni
 * - Base models: "base" in name
 * - Small context: < 8000 tokens
 */
export function isEvaluationSuitable(model: OpenRouterModelWithMeta): boolean {
  const lower = model.shortName.toLowerCase();
  const id = model.id.toLowerCase();

  // Lightweight models - weak reasoning, JSON formatting issues
  // Note: " mini" and "-mini" to avoid matching "gemini"
  const isLightweight =
    lower.includes("haiku") ||
    lower.includes("nano") ||
    lower.includes(" mini") ||
    lower.includes("-mini") ||
    lower.includes("lite") ||
    lower.includes("flash") ||
    lower.includes("tiny") ||
    lower.includes("small");

  // Code-specialized models - optimized for different task
  const isCodeSpecialized =
    lower.includes("code") ||
    lower.includes("coder") ||
    lower.includes("codex");

  // Vision-specialized models - not text-focused
  const isVisionSpecialized =
    lower.includes("vision") ||
    id.includes("-vl") ||
    lower.includes("-vl") ||
    lower.includes("omni");

  // Base models - won't follow evaluation prompts
  const isBaseModel = lower.includes("base");

  // Small context - can't fit multiple responses
  const hasSmallContext = model.context_length < 8000;

  // Exclude if any negative filter matches
  if (isLightweight || isCodeSpecialized || isVisionSpecialized || isBaseModel || hasSmallContext) {
    return false;
  }

  return true;
}

/**
 * Get recommended evaluator models from the catalog
 *
 * Selection criteria:
 * 1. Filter to evaluation-suitable models (no nano/mini/lite/flash)
 * 2. Prefer "latest" versions over dated snapshots
 * 3. Ensure provider diversity (max one per provider)
 * 4. Prefer major providers (Anthropic, OpenAI, Google)
 *
 * @param models - Full model catalog
 * @param maxModels - Maximum number of recommendations (default: 3)
 * @returns Array of model IDs
 */
export function getRecommendedEvaluatorModels(
  models: OpenRouterModelWithMeta[],
  maxModels: number = 3
): string[] {
  // Filter to suitable models
  const suitableModels = models.filter(isEvaluationSuitable);

  // Priority providers for evaluation
  const priorityProviders = ["anthropic", "openai", "google"];

  // Score and sort models
  const scoredModels = suitableModels
    .map((model) => ({
      model,
      score: getVersionScore(model),
      isPriority: priorityProviders.includes(model.provider),
    }))
    .sort((a, b) => {
      // Priority providers first
      if (a.isPriority && !b.isPriority) return -1;
      if (!a.isPriority && b.isPriority) return 1;
      // Then by version score (higher is better)
      return b.score - a.score;
    });

  // Pick models ensuring provider diversity
  const selectedIds: string[] = [];
  const usedProviders = new Set<string>();

  for (const { model } of scoredModels) {
    if (selectedIds.length >= maxModels) break;

    // Skip if we already have a model from this provider
    if (usedProviders.has(model.provider)) continue;

    selectedIds.push(model.id);
    usedProviders.add(model.provider);
  }

  // If we don't have enough diverse models, fill with best remaining
  if (selectedIds.length < maxModels) {
    for (const { model } of scoredModels) {
      if (selectedIds.length >= maxModels) break;
      if (selectedIds.includes(model.id)) continue;
      selectedIds.push(model.id);
    }
  }

  return selectedIds;
}
