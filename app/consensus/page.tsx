"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { NoKeysAlert } from "@/components/chat/no-keys-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConsensusSettings } from "@/components/consensus/consensus-settings";
import { RoundIndicator } from "@/components/consensus/round-indicator";
import { MetaConversation } from "@/components/consensus/meta-conversation";
import { DualView } from "@/components/consensus/dual-view";
import { ModelSelector } from "@/components/consensus/model-selector";
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
  const [availableKeys, setAvailableKeys] = useState<AvailableKeys | null>(null);

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

  // Fetch available API keys
  useEffect(() => {
    async function fetchAvailableKeys() {
      try {
        const response = await fetch("/api/keys");
        if (response.ok) {
          const data = await response.json();
          setAvailableKeys({
            anthropic: !!data.keys.anthropic,
            openai: !!data.keys.openai,
            google: !!data.keys.google,
          });
        }
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      }
    }
    fetchAvailableKeys();
  }, []);

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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const event: ConsensusStreamEvent = JSON.parse(line);
            handleStreamEvent(event);
          } catch (e) {
            console.error("Failed to parse chunk:", e);
          }
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
        setCurrentRoundResponses(new Map());
        setCurrentEvaluation(null);
        break;

      case "model-response":
        setCurrentRoundResponses((prev) => {
          const updated = new Map(prev);
          updated.set(event.data.modelId, event.data.content);
          return updated;
        });
        break;

      case "evaluation":
        setCurrentEvaluation(event.data);
        break;

      case "refinement-prompts":
        // Save current round as complete
        if (currentEvaluation) {
          const roundData: RoundData = {
            roundNumber: event.round,
            responses: new Map(currentRoundResponses),
            evaluation: {
              score: currentEvaluation.score || 0,
              reasoning: currentEvaluation.reasoning || "",
              keyDifferences: currentEvaluation.keyDifferences || [],
              isGoodEnough: currentEvaluation.isGoodEnough || false,
            },
            refinementPrompts: event.data,
          };
          setRounds((prev) => [...prev, roundData]);
        }
        break;

      case "synthesis-start":
        // Save final round without refinement prompts
        if (currentEvaluation) {
          const roundData: RoundData = {
            roundNumber: currentRound,
            responses: new Map(currentRoundResponses),
            evaluation: {
              score: currentEvaluation.score || 0,
              reasoning: currentEvaluation.reasoning || "",
              keyDifferences: currentEvaluation.keyDifferences || [],
              isGoodEnough: currentEvaluation.isGoodEnough || false,
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

  if (availableKeys === null) {
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

        {/* Model Selection */}
        <ModelSelector
          availableKeys={availableKeys}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          disabled={isProcessing}
        />

        {/* Settings */}
        <ConsensusSettings
          maxRounds={maxRounds}
          setMaxRounds={setMaxRounds}
          consensusThreshold={consensusThreshold}
          setConsensusThreshold={setConsensusThreshold}
          disabled={isProcessing}
        />

        {/* Input */}
        <div className="mx-auto w-full max-w-[80%]">
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isProcessing}
            onSubmit={handleSubmit}
          />
        </div>

        {/* Round Indicator */}
        {currentRound > 0 && (
          <RoundIndicator
            currentRound={currentRound}
            maxRounds={maxRounds}
            rounds={rounds.map((r) => ({
              roundNumber: r.roundNumber,
              consensusScore: r.evaluation.score,
            }))}
            isSynthesizing={isSynthesizing}
          />
        )}

        {/* Current Round Responses */}
        {isProcessing && currentRoundResponses.size > 0 && !isSynthesizing && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">
              Round {currentRound} Responses
            </h3>
            <div className={`grid gap-4 ${selectedModels.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
              {selectedModels.map((model) => (
                <Card key={model.id}>
                  <CardHeader>
                    <h4 className="font-semibold">{model.label}</h4>
                  </CardHeader>
                  <CardContent className="max-h-[400px] overflow-y-auto">
                    <div className="markdown-content text-sm">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                          ul: ({ node, ...props }) => <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />,
                          ol: ({ node, ...props }) => <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />,
                          li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                          h1: ({ node, ...props }) => <h1 className="mb-4 mt-6 text-2xl font-bold" {...props} />,
                          h2: ({ node, ...props }) => <h2 className="mb-3 mt-5 text-xl font-bold" {...props} />,
                          h3: ({ node, ...props}) => <h3 className="mb-3 mt-4 text-lg font-bold" {...props} />,
                          strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                        }}
                      >
                        {currentRoundResponses.get(model.id) || "Waiting..."}
                      </ReactMarkdown>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Current Evaluation */}
        {currentEvaluation && (
          <div className="p-4 border rounded-lg bg-muted/50">
            <h4 className="font-semibold mb-2">Consensus Evaluation</h4>
            <p className="text-sm mb-2">
              Score: {currentEvaluation.score}/100
            </p>
            {currentEvaluation.reasoning && (
              <p className="text-sm text-muted-foreground">
                {currentEvaluation.reasoning}
              </p>
            )}
          </div>
        )}

        {/* Meta-Conversation History */}
        {rounds.length > 0 && (
          <MetaConversation
            rounds={rounds}
            selectedModels={selectedModels}
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
