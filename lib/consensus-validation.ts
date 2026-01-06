/**
 * Consensus Validation Logic
 *
 * Pure functions for validating consensus UI state before submission.
 */

/**
 * State needed to validate consensus readiness
 */
export interface ConsensusState {
  /** Selected model IDs */
  models: string[];
  /** Selected evaluator model ID */
  evaluator: string | null;
  /** User's question/prompt */
  prompt: string;
}

/**
 * Validate consensus state and return list of error messages.
 *
 * @param state - Current consensus UI state
 * @returns Array of validation error messages (empty if valid)
 */
export function getConsensusValidationErrors(state: ConsensusState): string[] {
  const errors: string[] = [];

  // Model validation
  if (state.models.length < 2) {
    errors.push("Select at least 2 models");
  } else if (state.models.length > 3) {
    errors.push("Select at most 3 models");
  }

  // Evaluator validation
  if (!state.evaluator || state.evaluator.trim() === "") {
    errors.push("Select an evaluator model");
  }

  // Prompt validation
  if (!state.prompt || state.prompt.trim() === "") {
    errors.push("Enter a question");
  }

  return errors;
}

/**
 * Check if consensus is ready to submit.
 * Convenience wrapper around getConsensusValidationErrors.
 *
 * @param state - Current consensus UI state
 * @returns true if no validation errors
 */
export function isConsensusReady(state: ConsensusState): boolean {
  return getConsensusValidationErrors(state).length === 0;
}
