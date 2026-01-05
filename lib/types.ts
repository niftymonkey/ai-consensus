/**
 * Shared types for the AI Consensus application
 */

import type { TavilySearchResult } from "./tavily";
import type { AIErrorType } from "./consensus-events";

export interface ModelSelection {
  id: string; // model-1, model-2, model-3
  provider: string; // e.g., 'anthropic', 'openai', 'google', 'meta-llama', etc.
  modelId: string; // e.g., 'gpt-4o', 'claude-3-7-sonnet-20250219', or full OpenRouter ID like 'meta-llama/llama-4-scout'
  label: string; // Display name: 'GPT-4o', 'O1 Preview', 'Claude Sonnet 4.5'
}

export interface SearchData {
  query: string;
  results: TavilySearchResult[];
  round: number;
  triggeredBy: 'user' | 'model';
}

export interface ConsensusEvaluation {
  score: number;

  // Fun, punchy summary
  summary: string;          // 1-2 sentence conversational summary
  emoji: string;            // Single emoji: 🎉 (90-100), 👍 (75-89), 🤔 (50-74), ⚠️ (30-49), 💥 (0-29)
  vibe: "celebration" | "agreement" | "mixed" | "disagreement" | "clash";

  // Agreement-first approach
  areasOfAgreement: string[];  // What models DO agree on (shown first!)

  // Differences and detailed reasoning
  keyDifferences: string[];    // Reworded more dramatically
  reasoning: string;           // More conversational, less academic (collapsible)
  isGoodEnough: boolean;

  // Search request fields
  needsMoreInfo?: boolean;
  suggestedSearchQuery?: string;
}

export interface RoundData {
  roundNumber: number;
  responses: Map<string, string>; // modelId -> response text
  evaluation: ConsensusEvaluation;
  refinementPrompts?: Record<string, string>; // modelId -> prompt
  searchData?: SearchData; // Search results used in this round
}

export interface ConsensusState {
  prompt: string;
  isProcessing: boolean;
  selectedModels: ModelSelection[]; // 2-3 models
  settings: {
    maxRounds: number;
    consensusThreshold: number;
  };
  rounds: RoundData[];
  currentRound: number;
  finalConsensus: string | null;
  finalResponses: Map<string, string> | null; // modelId -> response text
  progressionSummary: string | null; // Summary of how consensus evolved
}

// Stream event types from API
export type ConsensusStreamEvent =
  | { type: "start"; conversationId: number }
  | {
      type: "round-status";
      data: { roundNumber: number; maxRounds: number; status: string };
    }
  | { type: "search-start"; round: number; query: string }
  | { type: "search-complete"; round: number; data: SearchData }
  | { type: "search-error"; round: number; error: string }
  | {
      type: "model-response";
      data: {
        modelId: string;
        modelLabel: string;
        content: string;
        round: number;
      };
    }
  | {
      type: "model-complete";
      data: {
        modelId: string;
        round: number;
      };
    }
  | { type: "evaluation-start"; round: number }
  | { type: "evaluation"; data: Partial<ConsensusEvaluation>; round: number }
  | { type: "evaluation-complete"; round: number }
  | {
      type: "model-error";
      data: {
        modelId: string;
        modelLabel: string;
        error: string;
        errorType?: AIErrorType;
        round: number;
      };
    }
  | { type: "refinement-prompts"; data: Record<string, string>; round: number }
  | { type: "synthesis-start" }
  | { type: "synthesis-chunk"; content: string }
  | { type: "progression-summary-start" }
  | { type: "progression-summary-chunk"; content: string }
  | { type: "final-responses"; data: Record<string, string> }
  | { type: "complete" }
  | { type: "error"; data: { message: string; round: number; details: string } };
