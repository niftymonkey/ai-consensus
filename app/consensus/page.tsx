"use client";

import { useState, useEffect, useRef } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { NoKeysAlert } from "@/components/chat/no-keys-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { ConsensusSettings } from "@/components/consensus/consensus-settings";
import { RoundsPanel } from "@/components/consensus/rounds-panel";
import { DualView } from "@/components/consensus/dual-view";
import { ModelSelector } from "@/components/consensus/model-selector";
import { useAvailableModels } from "@/hooks/use-available-models";
import { Loader2 } from "lucide-react";
import type {
  ModelSelection,
  RoundData,
  ConsensusStreamEvent,
  ConsensusEvaluation,
} from "@/lib/types";

interface AvailableKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
}

export default function ConsensusPage() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Use the new hook to fetch available models
  const { models: availableModels, hasKeys: availableKeys, isLoading: modelsLoading } = useAvailableModels();

  // Settings
  const [maxRounds, setMaxRounds] = useState(3);
  const [consensusThreshold, setConsensusThreshold] = useState(80);
  const [evaluatorModel, setEvaluatorModel] = useState("claude-3-7-sonnet-20250219");

  // Model selection (2-3 models)
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);

  // Workflow state
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentRoundResponses, setCurrentRoundResponses] = useState<Map<string, string>>(new Map());
  const [currentEvaluation, setCurrentEvaluation] = useState<Partial<ConsensusEvaluation> | null>(null);
  const [finalConsensus, setFinalConsensus] = useState<string | null>(null);
  const [finalResponses, setFinalResponses] = useState<Map<string, string> | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isGeneratingProgression, setIsGeneratingProgression] = useState(false);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);

  // Use refs to track latest values for event handling (avoids stale closures)
  const currentEvaluationRef = useRef<Partial<ConsensusEvaluation> | null>(null);
  const currentRoundResponsesRef = useRef<Map<string, string>>(new Map());
  const currentRoundRef = useRef<number>(0);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize default models when available models are loaded
  useEffect(() => {
    if (availableModels && selectedModels.length === 0) {
      const defaultModels: ModelSelection[] = [];

      if (availableModels.anthropic.length > 0) {
        defaultModels.push({
          id: "model-1",
          provider: "anthropic",
          modelId: availableModels.anthropic[0].id,
          label: availableModels.anthropic[0].name,
        });
      }

      if (availableModels.openai.length > 0) {
        defaultModels.push({
          id: "model-2",
          provider: "openai",
          modelId: availableModels.openai[0].id,
          label: availableModels.openai[0].name,
        });
      }

      // Only initialize if we have at least 2 models
      if (defaultModels.length >= 2) {
        setSelectedModels(defaultModels);
      }
    }
  }, [availableModels, selectedModels.length]);

  // Initialize default evaluator model when available models are loaded
  useEffect(() => {
    if (availableModels && evaluatorModel === "claude-3-7-sonnet-20250219") {
      // Filter evaluation-suitable models (exclude nano/mini/lite)
      const filterModels = (models: typeof availableModels.anthropic) => {
        return models.filter(m => {
          const lower = m.name.toLowerCase();
          return !lower.includes('nano') &&
                 !lower.includes(' mini') &&
                 !lower.includes('-mini') &&
                 !lower.includes('lite');
        });
      };

      const suitableModels = [
        ...filterModels(availableModels.anthropic),
        ...filterModels(availableModels.openai),
        ...filterModels(availableModels.google),
      ];

      // 1. Try recommended models first
      const recommended = suitableModels.find(m => m.recommended);

      // 2. Fall back to budget OpenAI models
      const budgetOpenAI = suitableModels.find(m =>
        m.provider === 'openai' && m.costTier === 'budget'
      );

      // 3. Otherwise use first suitable model
      if (recommended) {
        setEvaluatorModel(recommended.id);
      } else if (budgetOpenAI) {
        setEvaluatorModel(budgetOpenAI.id);
      } else if (suitableModels.length > 0) {
        setEvaluatorModel(suitableModels[0].id);
      }
    }
  }, [availableModels]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!prompt.trim()) return;
    if (selectedModels.length < 2 || selectedModels.length > 3) {
      alert("Please select 2-3 models");
      return;
    }

    // Log models being used
    console.log('=== Starting Consensus Evaluation ===');
    console.log('Selected models:', selectedModels.map(m => `${m.provider}:${m.modelId} (${m.label})`));
    console.log('Evaluator model:', evaluatorModel);
    console.log('Max rounds:', maxRounds);
    console.log('Consensus threshold:', consensusThreshold + '%');

    setIsProcessing(true);
    setRounds([]);
    setCurrentRound(0);
    setCurrentRoundResponses(new Map());
    setCurrentEvaluation(null);
    setFinalConsensus(null);
    setFinalResponses(null);
    setProgressionSummary(null);
    setIsSynthesizing(false);
    setIsGeneratingProgression(false);
    setOverallStatus(null);

    // Set client-side timeout safeguard (90 seconds)
    timeoutIdRef.current = setTimeout(() => {
      if (isProcessing || isSynthesizing) {
        alert("The consensus evaluation is taking too long. Please try again.");
        setIsProcessing(false);
        setIsSynthesizing(false);
        setOverallStatus(null);
      }
    }, 90000);

    try {
      const response = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          models: selectedModels,
          maxRounds,
          consensusThreshold,
          evaluatorModel,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: "Failed to get response" }));
        throw new Error(error.error || "Failed to get response");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response stream");
      }

      let buffer = ""; // Buffer for incomplete JSON lines

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode chunk and append to buffer
        buffer += decoder.decode(value, { stream: true });

        // Split by newlines
        const lines = buffer.split("\n");

        // Keep the last (potentially incomplete) line in the buffer
        buffer = lines.pop() || "";

        // Process complete lines
        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const event: ConsensusStreamEvent = JSON.parse(line);
            handleStreamEvent(event);
          } catch (e) {
            console.error("Failed to parse chunk:", e, "Line:", line);
          }
        }
      }

      // Process any remaining buffered data
      if (buffer.trim()) {
        try {
          const event: ConsensusStreamEvent = JSON.parse(buffer);
          handleStreamEvent(event);
        } catch (e) {
          console.error("Failed to parse final buffer:", e);
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      alert(error.message || "An error occurred");
    } finally {
      setIsProcessing(false);
      // Clear timeout when processing completes
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    }
  }

  function handleStreamEvent(event: ConsensusStreamEvent) {
    switch (event.type) {
      case "start":
        setConversationId(event.conversationId);
        setOverallStatus("Starting consensus generation...");
        break;

      case "round-status":
        setCurrentRound(event.data.roundNumber);
        currentRoundRef.current = event.data.roundNumber;
        setCurrentRoundResponses(new Map());
        currentRoundResponsesRef.current = new Map();
        setCurrentEvaluation(null);
        currentEvaluationRef.current = null;
        setOverallStatus(`Round ${event.data.roundNumber}: ${event.data.status}`);
        break;

      case "model-response":
        setCurrentRoundResponses((prev) => {
          const updated = new Map(prev);
          updated.set(event.data.modelId, event.data.content);
          currentRoundResponsesRef.current = updated;
          return updated;
        });
        // Update status to show which model is responding
        setOverallStatus(`Round ${event.data.round}: Receiving responses from models...`);
        break;

      case "evaluation": {
        // Ensure all new fields are properly handled
        const score = event.data.score || 0;

        // Calculate vibe and emoji from score if not provided
        const getVibeFromScore = (s: number): "celebration" | "agreement" | "mixed" | "disagreement" | "clash" => {
          if (s >= 90) return "celebration";
          if (s >= 75) return "agreement";
          if (s >= 50) return "mixed";
          if (s >= 30) return "disagreement";
          return "clash";
        };

        const getEmojiFromScore = (s: number): string => {
          if (s >= 90) return "🎉";
          if (s >= 75) return "👍";
          if (s >= 50) return "🤔";
          if (s >= 30) return "⚠️";
          return "💥";
        };

        const evaluationData: Partial<ConsensusEvaluation> = {
          score,
          summary: event.data.summary || "",
          emoji: event.data.emoji || getEmojiFromScore(score),
          vibe: event.data.vibe || getVibeFromScore(score),
          areasOfAgreement: event.data.areasOfAgreement || [],
          keyDifferences: event.data.keyDifferences || [],
          reasoning: event.data.reasoning || "",
          isGoodEnough: event.data.isGoodEnough || false,
        };
        setCurrentEvaluation(evaluationData);
        currentEvaluationRef.current = evaluationData;
        break;
      }

      case "refinement-prompts":
        // Save current round as complete (use ref to avoid stale closure)
        if (currentEvaluationRef.current) {
          const roundData: RoundData = {
            roundNumber: event.round,
            responses: new Map(currentRoundResponsesRef.current),
            evaluation: {
              score: currentEvaluationRef.current.score || 0,
              summary: currentEvaluationRef.current.summary || "",
              emoji: currentEvaluationRef.current.emoji || "🤔",
              vibe: currentEvaluationRef.current.vibe || "mixed",
              areasOfAgreement: currentEvaluationRef.current.areasOfAgreement || [],
              keyDifferences: currentEvaluationRef.current.keyDifferences || [],
              reasoning: currentEvaluationRef.current.reasoning || "",
              isGoodEnough: currentEvaluationRef.current.isGoodEnough || false,
            },
            refinementPrompts: event.data,
          };
          setRounds((prev) => [...prev, roundData]);
        }
        break;

      case "synthesis-start":
        // Save final round without refinement prompts (use ref to avoid stale closure)
        if (currentEvaluationRef.current) {
          const roundData: RoundData = {
            roundNumber: currentRoundRef.current,
            responses: new Map(currentRoundResponsesRef.current),
            evaluation: {
              score: currentEvaluationRef.current.score || 0,
              summary: currentEvaluationRef.current.summary || "",
              emoji: currentEvaluationRef.current.emoji || "🤔",
              vibe: currentEvaluationRef.current.vibe || "mixed",
              areasOfAgreement: currentEvaluationRef.current.areasOfAgreement || [],
              keyDifferences: currentEvaluationRef.current.keyDifferences || [],
              reasoning: currentEvaluationRef.current.reasoning || "",
              isGoodEnough: currentEvaluationRef.current.isGoodEnough || false,
            },
          };
          setRounds((prev) => [...prev, roundData]);
        }
        setIsSynthesizing(true);
        setFinalConsensus("");
        setOverallStatus("Synthesizing final consensus response...");
        break;

      case "synthesis-chunk":
        setFinalConsensus((prev) => (prev || "") + event.content);
        setOverallStatus("Generating final consensus...");
        break;

      case "progression-summary-start":
        setIsGeneratingProgression(true);
        setProgressionSummary("");
        setOverallStatus("Analyzing how consensus evolved...");
        break;

      case "progression-summary-chunk":
        setProgressionSummary((prev) => (prev || "") + event.content);
        setOverallStatus("Generating progression summary...");
        break;

      case "final-responses":
        setFinalResponses(new Map(Object.entries(event.data)));
        setOverallStatus("Finalizing results...");
        break;

      case "evaluation-start":
        setOverallStatus(`Round ${event.round}: Evaluating consensus...`);
        break;

      case "evaluation-complete":
        setOverallStatus(`Round ${event.round}: Evaluation complete`);
        break;

      case "model-error":
        console.warn(`Model error: ${event.data.modelLabel}`, event.data.error);
        alert(`${event.data.modelLabel} failed to respond. Continuing with other models.`);
        break;

      case "complete":
        setOverallStatus("Complete!");
        setIsGeneratingProgression(false);
        setTimeout(() => setOverallStatus(null), 2000); // Clear after 2 seconds
        break;

      case "error":
        console.error("Consensus error:", event.data);
        alert(event.data?.message || "An error occurred during consensus generation");
        setIsProcessing(false);
        setIsSynthesizing(false);
        setIsGeneratingProgression(false);
        setOverallStatus(null);
        break;
    }
  }

  const hasAnyKeys = availableKeys && (availableKeys.anthropic || availableKeys.openai || availableKeys.google);
  const keyCount = availableKeys ? [availableKeys.anthropic, availableKeys.openai, availableKeys.google].filter(Boolean).length : 0;

  if (availableKeys === null || modelsLoading) {
    return (
      <div className="container py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  if (!hasAnyKeys) {
    return (
      <div className="container py-12">
        <div className="space-y-6">
          <ChatHeader keyCount={keyCount} />
          <NoKeysAlert />
        </div>
      </div>
    );
  }

  const showResults = finalConsensus !== null && finalResponses !== null;

  return (
    <div className="container py-12">
      <div className="space-y-10">
        {/* Overall Status Indicator */}
        {overallStatus && (
          <div className="mx-auto w-full max-w-[80%]">
            <div className="flex items-center justify-center gap-3 rounded-lg border border-blue-200 bg-blue-50 px-6 py-4 dark:border-blue-900 dark:bg-blue-950/20">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-base font-medium text-blue-900 dark:text-blue-100">
                {overallStatus}
              </span>
            </div>
          </div>
        )}

        {/* Input */}
        <div className="mx-auto w-full max-w-[80%]">
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isProcessing}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Model Selection and Settings */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Model Selection */}
          {availableModels && (
            <ModelSelector
              availableKeys={availableKeys}
              availableModels={availableModels}
              selectedModels={selectedModels}
              setSelectedModels={setSelectedModels}
              disabled={isProcessing}
            />
          )}

          {/* Settings */}
          <ConsensusSettings
            maxRounds={maxRounds}
            setMaxRounds={setMaxRounds}
            consensusThreshold={consensusThreshold}
            setConsensusThreshold={setConsensusThreshold}
            evaluatorModel={evaluatorModel}
            setEvaluatorModel={setEvaluatorModel}
            availableModels={availableModels}
            disabled={isProcessing}
          />
        </div>

        {/* Rounds Panel */}
        {currentRound > 0 && (
          <RoundsPanel
            currentRound={currentRound}
            maxRounds={maxRounds}
            rounds={rounds}
            selectedModels={selectedModels}
            isSynthesizing={isSynthesizing}
            isProcessing={isProcessing}
            consensusThreshold={consensusThreshold}
            currentRoundResponses={currentRoundResponses}
            currentEvaluation={currentEvaluation}
          />
        )}

        {/* Final Results */}
        {showResults && (
          <DualView
            consensusContent={finalConsensus}
            finalResponses={finalResponses}
            selectedModels={selectedModels}
            isStreaming={isProcessing}
            progressionSummary={progressionSummary}
            isGeneratingProgression={isGeneratingProgression}
          />
        )}
      </div>
    </div>
  );
}
