/**
 * Model Availability Logic
 *
 * Pure functions for filtering and mapping models based on API key availability.
 * Used by /api/models/available to determine which models users can access.
 *
 * Key concepts:
 * - OpenRouter format: "anthropic/claude-3.7-sonnet" (provider/model with dots)
 * - Direct format: "claude-3-7-sonnet-20250219" (no provider, hyphens, date suffix)
 *
 * When users have only direct keys (no OpenRouter), we need to:
 * 1. Filter to only models from providers with keys
 * 2. Check provider APIs for actual model availability
 * 3. Map OpenRouter format IDs to direct format IDs
 * 4. Ensure no duplicate model IDs in the result
 */

/**
 * Minimal model representation - any object with these required fields
 */
export interface ModelBase {
  /** Model ID */
  id: string;
  /** Provider name (e.g., "anthropic") */
  provider: string;
  /** Display name */
  name: string;
}

/**
 * Result of provider availability checks
 */
export interface ProviderAvailability {
  anthropic: string[];
  openai: string[];
  google: string[];
  errors: Record<string, string>;
}

/**
 * Which providers the user has keys for
 */
export interface HasKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
}

/**
 * Direct providers that support direct API access
 */
const DIRECT_PROVIDERS = ["anthropic", "openai", "google"] as const;
type DirectProvider = (typeof DIRECT_PROVIDERS)[number];

function isDirectProvider(provider: string): provider is DirectProvider {
  return DIRECT_PROVIDERS.includes(provider as DirectProvider);
}

/**
 * Normalize a model ID for comparison between OpenRouter and direct provider formats.
 *
 * Normalization steps:
 * 1. Remove provider prefix (anthropic/, openai/, google/)
 * 2. Replace dots with hyphens (3.5 -> 3-5)
 * 3. Remove date suffixes (-YYYYMMDD)
 * 4. Lowercase for case-insensitive matching
 *
 * @example
 * normalizeModelId("anthropic/claude-3.5-haiku") // "claude-3-5-haiku"
 * normalizeModelId("claude-3-5-haiku-20241022")  // "claude-3-5-haiku"
 */
export function normalizeModelId(modelId: string): string {
  let normalized = modelId;

  // Step 1: Remove provider prefix
  if (normalized.includes("/")) {
    normalized = normalized.split("/").slice(1).join("/");
  }

  // Step 2: Replace dots with hyphens
  normalized = normalized.replace(/\./g, "-");

  // Step 3: Remove date suffixes (8 digits at end, preceded by hyphen)
  normalized = normalized.replace(/-\d{8}$/, "");

  // Step 4: Lowercase
  return normalized.toLowerCase();
}

/**
 * Find the direct provider model ID that matches an OpenRouter model ID.
 *
 * @param openRouterId - OpenRouter format model ID (e.g., "anthropic/claude-3.5-haiku")
 * @param provider - Provider name (e.g., "anthropic")
 * @param availability - Available models from provider APIs
 * @returns The matching direct provider model ID, or null if no match
 */
export function mapOpenRouterToDirectId(
  openRouterId: string,
  provider: string,
  availability: ProviderAvailability
): string | null {
  if (!isDirectProvider(provider)) {
    return null;
  }

  const providerModels = availability[provider];
  if (!providerModels || providerModels.length === 0) {
    return null;
  }

  const normalizedOpenRouter = normalizeModelId(openRouterId);

  // Build lookup map: normalized ID -> actual provider model ID
  const normalizedToActual = new Map<string, string>();
  for (const actualId of providerModels) {
    normalizedToActual.set(normalizeModelId(actualId), actualId);
  }

  // Try exact match first
  if (normalizedToActual.has(normalizedOpenRouter)) {
    return normalizedToActual.get(normalizedOpenRouter)!;
  }

  // Check if this is a variant model (has : suffix like :thinking, :beta)
  // Variants should only match if there's an exact variant in availability
  if (normalizedOpenRouter.includes(":")) {
    // No exact match found and it's a variant - don't fall back to base model
    return null;
  }

  // Fallback: substring matching for partial matches
  // (e.g., "claude-3-haiku" matching "claude-3-haiku-20240307")
  // Only for non-variant models
  for (const [normId, actualId] of normalizedToActual) {
    // Skip variants in availability for base model matching
    if (normId.includes(":")) {
      continue;
    }
    if (normalizedOpenRouter.includes(normId) || normId.includes(normalizedOpenRouter)) {
      return actualId;
    }
  }

  return null;
}

/**
 * Filter and map OpenRouter models to direct provider models.
 *
 * For users with only direct API keys (no OpenRouter key):
 * 1. Filter to only models from providers with keys
 * 2. Map OpenRouter format IDs to direct provider format IDs
 * 3. Ensure no duplicate model IDs in result
 *
 * @param models - Full OpenRouter catalog
 * @param availability - Available models from provider API checks
 * @param hasKeys - Which providers the user has keys for
 * @returns Filtered models with direct provider IDs (no duplicates)
 */
export function filterAndMapModelsForDirectKeys<T extends ModelBase>(
  models: T[],
  availability: ProviderAvailability,
  hasKeys: HasKeys
): T[] {
  const result: T[] = [];
  const seenDirectIds = new Set<string>();

  for (const model of models) {
    // Skip non-direct providers
    if (!isDirectProvider(model.provider)) {
      continue;
    }

    // Skip providers without keys
    if (!hasKeys[model.provider]) {
      continue;
    }

    // Try to map to direct provider ID
    const directId = mapOpenRouterToDirectId(model.id, model.provider, availability);

    // Skip if no matching direct provider model found
    if (!directId) {
      continue;
    }

    // Skip if we've already added this direct ID (prevents duplicates)
    if (seenDirectIds.has(directId)) {
      continue;
    }

    // Add model with direct provider ID
    seenDirectIds.add(directId);
    result.push({
      ...model,
      id: directId,
    } as T);
  }

  return result;
}
