/**
 * Preview System Configuration
 *
 * Centralizes all preview constraints and configuration.
 * Preview runs use a system-wide OpenRouter API key with strict limits to control costs.
 *
 * NOTE: This file is imported by client components via preview-preset.ts.
 * Server-only functions (like isPreviewEnabledForUser) are in posthog-server.ts.
 *
 * Cost estimates (as of Jan 2025):
 * - GPT-4o-mini: ~$0.15/1M input, ~$0.60/1M output
 * - Claude 3.5 Haiku: ~$0.80/1M input, ~$4/1M output
 * - With ~5 participants and 2 rounds: estimated $0.01-0.05 per preview run
 */

// =============================================================================
// Preview API Key (Server-side only)
// =============================================================================

/**
 * Get the preview API key for OpenRouter
 * This key is used for all preview runs and should have spend limits configured
 *
 * @throws Error if OPENROUTER_PREVIEW_API_KEY is not configured
 * @returns The preview API key
 */
export function getPreviewApiKey(): string {
  const key = process.env.OPENROUTER_PREVIEW_API_KEY;

  if (!key) {
    throw new Error(
      "OPENROUTER_PREVIEW_API_KEY is not configured. " +
        "Preview runs require a system API key. " +
        "See .env.example for setup instructions."
    );
  }

  return key;
}

/**
 * Check if preview system is enabled (API key is configured)
 * This is a quick sync check - use isPreviewEnabledForUser from posthog-server.ts for feature flag support
 */
export function isPreviewEnabled(): boolean {
  return !!process.env.OPENROUTER_PREVIEW_API_KEY;
}

// =============================================================================
// Preview Constraints
// =============================================================================

/**
 * Models allowed in preview mode
 * Selected for low cost while maintaining quality
 * Format: OpenRouter model IDs (provider/model-name)
 */
export const PREVIEW_ALLOWED_MODELS = [
  "openai/gpt-4o-mini", // ~$0.15/1M input, $0.60/1M output
  "anthropic/claude-3.5-haiku", // ~$0.80/1M input, $4/1M output
  "google/gemini-2.0-flash-001", // ~$0.10/1M input, $0.40/1M output
  "x-ai/grok-4-fast", // ~$0.20/1M input, $0.50/1M output, 128k context
  "mistralai/mistral-small-24b-instruct-2501", // ~$0.10/1M input, $0.30/1M output
] as const;

export type PreviewAllowedModel = (typeof PREVIEW_ALLOWED_MODELS)[number];

/**
 * Preview configuration limits
 */
export const PREVIEW_CONFIG = {
  /** Maximum number of preview runs per user (identified by IP hash) */
  maxRuns: 3,

  /** Maximum rounds per evaluation in preview mode */
  maxRounds: 2,

  /** Maximum participants (AI models) per evaluation in preview mode */
  maxParticipants: 2,

  /** Models allowed in preview mode */
  allowedModels: PREVIEW_ALLOWED_MODELS,
} as const;

// =============================================================================
// Validation Functions
// =============================================================================

export interface PreviewValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Check if a model ID is allowed in preview mode
 */
export function isModelAllowedInPreview(modelId: string): boolean {
  return PREVIEW_ALLOWED_MODELS.includes(modelId as PreviewAllowedModel);
}

/**
 * Validate evaluation parameters against preview constraints
 *
 * @param params - Evaluation parameters to validate
 * @returns Validation result with any errors
 */
export function validatePreviewParams(params: {
  models?: string[];
  rounds?: number;
  participants?: number;
}): PreviewValidationResult {
  const errors: string[] = [];

  // Validate models
  if (params.models) {
    const invalidModels = params.models.filter(
      (model) => !isModelAllowedInPreview(model)
    );
    if (invalidModels.length > 0) {
      errors.push(
        `Models not allowed in preview: ${invalidModels.join(", ")}. ` +
          `Preview allows: ${PREVIEW_ALLOWED_MODELS.join(", ")}`
      );
    }
  }

  // Validate rounds
  if (params.rounds !== undefined && params.rounds > PREVIEW_CONFIG.maxRounds) {
    errors.push(
      `Preview mode allows maximum ${PREVIEW_CONFIG.maxRounds} rounds. Requested: ${params.rounds}`
    );
  }

  // Validate participants
  if (
    params.participants !== undefined &&
    params.participants > PREVIEW_CONFIG.maxParticipants
  ) {
    errors.push(
      `Preview mode allows maximum ${PREVIEW_CONFIG.maxParticipants} participants. Requested: ${params.participants}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if evaluation parameters are within preview limits
 * Convenience function that returns boolean only
 */
export function isWithinPreviewLimits(params: {
  models?: string[];
  rounds?: number;
  participants?: number;
}): boolean {
  return validatePreviewParams(params).valid;
}
