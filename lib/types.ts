/**
 * Shared types for the AI Consensus application
 */

export interface ModelSelection {
  id: string; // model-1, model-2, model-3
  provider: "anthropic" | "openai" | "google";
  modelId: string; // e.g., 'gpt-4o', 'o1-preview', 'claude-3-7-sonnet-20250219'
  label: string; // Display name: 'GPT-4o', 'O1 Preview', 'Claude Sonnet 4.5'
}

export interface ConsensusEvaluation {
  score: number;
  reasoning: string;
  keyDifferences: string[];
  isGoodEnough: boolean;
}

export interface RoundData {
  roundNumber: number;
  responses: Map<string, string>; // modelId -> response text
  evaluation: ConsensusEvaluation;
  refinementPrompts?: Record<string, string>; // modelId -> prompt
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
}

// Stream event types from API
export type ConsensusStreamEvent =
  | { type: "start"; conversationId: number }
  | {
      type: "round-status";
      data: { roundNumber: number; maxRounds: number; status: string };
    }
  | {
      type: "model-response";
      data: {
        modelId: string;
        modelLabel: string;
        content: string;
        round: number;
      };
    }
  | { type: "evaluation"; data: Partial<ConsensusEvaluation>; round: number }
  | { type: "refinement-prompts"; data: Record<string, string>; round: number }
  | { type: "synthesis-start" }
  | { type: "synthesis-chunk"; content: string }
  | { type: "final-responses"; data: Record<string, string> }
  | { type: "complete" }
  | { type: "error"; error: string };
