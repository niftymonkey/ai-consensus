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

  // Model selection (2-3 models)
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);

  // Workflow state
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentRoundResponses, setCurrentRoundResponses] = useState<Map<string, string>>(new Map());
  const [currentEvaluation, setCurrentEvaluation] = useState<Partial<ConsensusEvaluation> | null>(null);
  const [finalConsensus, setFinalConsensus] = useState<string | null>(null);
  const [finalResponses, setFinalResponses] = useState<Map<string, string> | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Use refs to track latest values for event handling (avoids stale closures)
  const currentEvaluationRef = useRef<Partial<ConsensusEvaluation> | null>(null);
  const currentRoundResponsesRef = useRef<Map<string, string>>(new Map());
  const currentRoundRef = useRef<number>(0);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!prompt.trim()) return;
    if (selectedModels.length < 2 || selectedModels.length > 3) {
      alert("Please select 2-3 models");
      return;
    }

    setIsProcessing(true);
    setRounds([]);
    setCurrentRound(0);
    setCurrentRoundResponses(new Map());
    setCurrentEvaluation(null);
    setFinalConsensus(null);
    setFinalResponses(null);
    setIsSynthesizing(false);

    try {
      const response = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          models: selectedModels,
          maxRounds,
          consensusThreshold,
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
    }
  }

  function handleStreamEvent(event: ConsensusStreamEvent) {
    switch (event.type) {
      case "start":
        setConversationId(event.conversationId);
        break;

      case "round-status":
        setCurrentRound(event.data.roundNumber);
        currentRoundRef.current = event.data.roundNumber;
        setCurrentRoundResponses(new Map());
        currentRoundResponsesRef.current = new Map();
        setCurrentEvaluation(null);
        currentEvaluationRef.current = null;
        break;

      case "model-response":
        setCurrentRoundResponses((prev) => {
          const updated = new Map(prev);
          updated.set(event.data.modelId, event.data.content);
          currentRoundResponsesRef.current = updated;
          return updated;
        });
        break;

      case "evaluation":
        setCurrentEvaluation(event.data);
        currentEvaluationRef.current = event.data;
        break;

      case "refinement-prompts":
        // Save current round as complete (use ref to avoid stale closure)
        if (currentEvaluationRef.current) {
          const roundData: RoundData = {
            roundNumber: event.round,
            responses: new Map(currentRoundResponsesRef.current),
            evaluation: {
              score: currentEvaluationRef.current.score || 0,
              reasoning: currentEvaluationRef.current.reasoning || "",
              keyDifferences: currentEvaluationRef.current.keyDifferences || [],
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
              reasoning: currentEvaluationRef.current.reasoning || "",
              keyDifferences: currentEvaluationRef.current.keyDifferences || [],
              isGoodEnough: currentEvaluationRef.current.isGoodEnough || false,
            },
          };
          setRounds((prev) => [...prev, roundData]);
        }
        setIsSynthesizing(true);
        setFinalConsensus("");
        break;

      case "synthesis-chunk":
        setFinalConsensus((prev) => (prev || "") + event.content);
        break;

      case "final-responses":
        setFinalResponses(new Map(Object.entries(event.data)));
        break;

      case "complete":
        break;

      case "error":
        console.error("Stream error:", event.error);
        alert(event.error);
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
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Consensus Mode</h1>
          <p className="text-muted-foreground">
            Watch AI models collaborate and refine their responses
          </p>
        </div>

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
          />
        )}
      </div>
    </div>
  );
}
