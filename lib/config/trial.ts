/**
 * Trial System Configuration
 *
 * Centralizes all trial constraints and configuration.
 * Trial runs use a system-wide OpenRouter API key with strict limits to control costs.
 *
 * Cost estimates (as of Jan 2025):
 * - GPT-4o-mini: ~$0.15/1M input, ~$0.60/1M output
 * - Claude 3.5 Haiku: ~$0.80/1M input, ~$4/1M output
 * - With ~5 participants and 2 rounds: estimated $0.01-0.05 per trial run
 */

// =============================================================================
// Trial API Key (Server-side only)
// =============================================================================

/**
 * Get the trial API key for OpenRouter
 * This key is used for all trial runs and should have spend limits configured
 *
 * @throws Error if OPENROUTER_TRIAL_API_KEY is not configured
 * @returns The trial API key
 */
export function getTrialApiKey(): string {
  const key = process.env.OPENROUTER_TRIAL_API_KEY;

  if (!key) {
    throw new Error(
      "OPENROUTER_TRIAL_API_KEY is not configured. " +
        "Trial runs require a system API key. " +
        "See .env.example for setup instructions."
    );
  }

  return key;
}

/**
 * Check if trial system is enabled (API key is configured)
 */
export function isTrialEnabled(): boolean {
  return !!process.env.OPENROUTER_TRIAL_API_KEY;
}

// =============================================================================
// Trial Constraints
// =============================================================================

/**
 * Models allowed in trial mode
 * Selected for low cost while maintaining quality
 * Format: OpenRouter model IDs (provider/model-name)
 */
export const TRIAL_ALLOWED_MODELS = [
  "openai/gpt-4o-mini", // ~$0.15/1M input, $0.60/1M output
  "anthropic/claude-3.5-haiku", // ~$0.80/1M input, $4/1M output
] as const;

export type TrialAllowedModel = (typeof TRIAL_ALLOWED_MODELS)[number];

/**
 * Trial configuration limits
 */
export const TRIAL_CONFIG = {
  /** Maximum number of trial runs per user (identified by IP hash) */
  maxRuns: 3,

  /** Maximum rounds per evaluation in trial mode */
  maxRounds: 2,

  /** Maximum participants (AI models) per evaluation in trial mode */
  maxParticipants: 5,

  /** Models allowed in trial mode */
  allowedModels: TRIAL_ALLOWED_MODELS,
} as const;

// =============================================================================
// Validation Functions
// =============================================================================

export interface TrialValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Check if a model ID is allowed in trial mode
 */
export function isModelAllowedInTrial(modelId: string): boolean {
  return TRIAL_ALLOWED_MODELS.includes(modelId as TrialAllowedModel);
}

/**
 * Validate evaluation parameters against trial constraints
 *
 * @param params - Evaluation parameters to validate
 * @returns Validation result with any errors
 */
export function validateTrialParams(params: {
  models?: string[];
  rounds?: number;
  participants?: number;
}): TrialValidationResult {
  const errors: string[] = [];

  // Validate models
  if (params.models) {
    const invalidModels = params.models.filter(
      (model) => !isModelAllowedInTrial(model)
    );
    if (invalidModels.length > 0) {
      errors.push(
        `Models not allowed in trial: ${invalidModels.join(", ")}. ` +
          `Trial allows: ${TRIAL_ALLOWED_MODELS.join(", ")}`
      );
    }
  }

  // Validate rounds
  if (params.rounds !== undefined && params.rounds > TRIAL_CONFIG.maxRounds) {
    errors.push(
      `Trial mode allows maximum ${TRIAL_CONFIG.maxRounds} rounds. Requested: ${params.rounds}`
    );
  }

  // Validate participants
  if (
    params.participants !== undefined &&
    params.participants > TRIAL_CONFIG.maxParticipants
  ) {
    errors.push(
      `Trial mode allows maximum ${TRIAL_CONFIG.maxParticipants} participants. Requested: ${params.participants}`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Check if evaluation parameters are within trial limits
 * Convenience function that returns boolean only
 */
export function isWithinTrialLimits(params: {
  models?: string[];
  rounds?: number;
  participants?: number;
}): boolean {
  return validateTrialParams(params).valid;
}
