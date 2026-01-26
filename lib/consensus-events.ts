/**
 * TypeScript types for consensus API streaming events
 */

import { ConsensusEvaluation, SearchData } from "./types";

export type AIErrorType = 'rate-limit' | 'openrouter-privacy' | 'provider_not_found' | 'generic';

export interface ModelErrorData {
  modelId: string;
  modelLabel: string;
  error: string;
  errorType: AIErrorType;
  round: number;
}

export interface ModelResponseData {
  modelId: string;
  modelLabel: string;
  content: string;
  round: number;
}

export interface ModelCompleteData {
  modelId: string;
  round: number;
}

export interface RoundStatusData {
  roundNumber: number;
  maxRounds: number;
  status: string;
}

export interface SearchStartData {
  query: string;
  round: number;
}

export interface SearchCompleteData {
  results: SearchData["results"];
  round: number;
}

export interface SearchErrorData {
  error: string;
  round: number;
}

export interface ErrorData {
  message: string;
  round?: number;
}

export interface TimingData {
  step: string;
  elapsedMs: number;
  elapsedSeconds: number;
  remainingSeconds: number;
  percentUsed: number;
  warning?: string;
}

export interface FinalData {
  consensus: string;
  progressionSummary: string | null;
  allRounds: Array<{
    round: number;
    responses: Record<string, string>;
    evaluation: ConsensusEvaluation;
  }>;
}

// Discriminated union for all possible events
export type ConsensusEvent =
  | { type: "start"; conversationId: number | null } // null for preview mode
  | { type: "round-status"; data: RoundStatusData }
  | { type: "search-start"; data: SearchStartData }
  | { type: "search-complete"; data: SearchCompleteData }
  | { type: "search-error"; data: SearchErrorData }
  | { type: "model-response"; data: ModelResponseData }
  | { type: "model-complete"; data: ModelCompleteData }
  | { type: "model-error"; data: ModelErrorData }
  | { type: "evaluation-start"; round: number }
  | { type: "evaluation"; data: Partial<ConsensusEvaluation>; round: number }
  | { type: "evaluation-complete"; round: number }
  | { type: "refinement-prompts"; data: Record<string, string>; round: number }
  | { type: "synthesis-start" }
  | { type: "synthesis-chunk"; content: string }
  | { type: "progression-summary-start" }
  | { type: "progression-summary-chunk"; content: string }
  | { type: "final-responses"; data: Record<string, string> }
  | { type: "complete" }
  | { type: "final"; data: FinalData }
  | { type: "error"; data: ErrorData }
  | { type: "timing"; data: TimingData };

/**
 * Helper to send a typed consensus event through a stream
 */
export function sendEvent(
  encoder: TextEncoder,
  controller: ReadableStreamDefaultController,
  event: ConsensusEvent
): boolean {
  try {
    controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
    return true;
  } catch (error) {
    // Stream closed (user canceled or connection dropped)
    return false;
  }
}
