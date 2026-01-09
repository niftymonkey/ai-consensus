/**
 * Model Routing Logic
 *
 * Pure functions for determining how to route model calls based on:
 * - Model ID format (OpenRouter format vs direct format)
 * - Available API keys
 * - Provider priority (direct > OpenRouter)
 */

/**
 * Available API keys for routing decisions
 */
export interface KeySet {
  anthropic: string | null;
  openai: string | null;
  google: string | null;
  openrouter: string | null;
}

/**
 * Result of routing decision
 */
export interface RouteInfo {
  /** Whether to use direct provider or OpenRouter */
  source: "direct" | "openrouter";
  /** The provider name (anthropic, openai, google, meta-llama, etc.) */
  provider: string;
  /** The model ID to pass to the API (extracted for direct, full for OpenRouter) */
  modelId: string;
}

/** Providers that support direct API keys */
const DIRECT_PROVIDERS = ["anthropic", "openai", "google"] as const;
type DirectProvider = (typeof DIRECT_PROVIDERS)[number];

/**
 * Check if a provider supports direct API access
 */
function isDirectProvider(provider: string): provider is DirectProvider {
  return DIRECT_PROVIDERS.includes(provider as DirectProvider);
}

/**
 * Extract the model ID portion from an OpenRouter format ID.
 * OpenRouter format: "provider/model-name" → returns "model-name"
 * Direct format: "model-name" → returns "model-name" unchanged
 *
 * @example
 * extractDirectModelId("openai/gpt-4o") → "gpt-4o"
 * extractDirectModelId("gpt-4o") → "gpt-4o"
 */
export function extractDirectModelId(modelId: string): string {
  if (modelId.includes("/")) {
    return modelId.split("/").slice(1).join("/");
  }
  return modelId;
}

/**
 * Resolve the provider from a model ID.
 * Handles both OpenRouter format (extracts) and direct format (infers from prefix).
 *
 * OpenRouter format: "provider/model-name" → extracts "provider"
 * Direct format: infers from model name prefix (claude→anthropic, gpt→openai, etc.)
 *
 * @example
 * resolveProvider("openai/gpt-4o") → "openai"
 * resolveProvider("gpt-4o") → "openai"
 * resolveProvider("claude-3.7-sonnet") → "anthropic"
 */
export function resolveProvider(modelId: string): string | null {
  // OpenRouter format: extract directly
  if (modelId.includes("/")) {
    return modelId.split("/")[0];
  }

  // Direct format: infer from model name prefix
  if (modelId.startsWith("claude")) {
    return "anthropic";
  }
  if (
    modelId.startsWith("gpt") ||
    modelId.startsWith("chatgpt") ||
    modelId.startsWith("o1") ||
    modelId.startsWith("o3") ||
    modelId.startsWith("o4")
  ) {
    return "openai";
  }
  if (modelId.startsWith("gemini")) {
    return "google";
  }

  return null;
}

/**
 * Determine the routing for a model based on available keys.
 *
 * Priority:
 * 1. Direct key if provider matches and key exists
 * 2. OpenRouter fallback if key exists
 * 3. null if no valid route
 *
 * @param modelId - Model ID in either format (openai/gpt-4o or gpt-4o)
 * @param keys - Available API keys
 * @returns Route info or null if no route available
 */
export function getRouteForModel(modelId: string, keys: KeySet): RouteInfo | null {
  const provider = resolveProvider(modelId);

  if (!provider) {
    return null;
  }

  // Check if this is a direct provider and we have the key
  if (isDirectProvider(provider)) {
    const directKey = keys[provider];
    if (directKey) {
      // Use direct provider
      return {
        source: "direct",
        provider,
        modelId: extractDirectModelId(modelId),
      };
    }
  }

  // Fall back to OpenRouter if available
  if (keys.openrouter) {
    // Ensure we have OpenRouter format for the modelId
    const openRouterModelId = modelId.includes("/")
      ? modelId
      : `${provider}/${modelId}`;

    return {
      source: "openrouter",
      provider,
      modelId: openRouterModelId,
    };
  }

  // No valid route
  return null;
}

/**
 * Check if a model can be accessed with the given keys.
 * Convenience wrapper around getRouteForModel.
 */
export function canAccessModel(modelId: string, keys: KeySet): boolean {
  return getRouteForModel(modelId, keys) !== null;
}

/**
 * Check if a provider is a direct provider (has direct API access)
 */
export function isDirectProviderName(provider: string): provider is DirectProvider {
  return isDirectProvider(provider);
}

/**
 * Get the list of direct provider names
 */
export function getDirectProviders(): readonly string[] {
  return DIRECT_PROVIDERS;
}
