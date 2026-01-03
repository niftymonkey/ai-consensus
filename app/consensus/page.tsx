"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { NoKeysAlert } from "@/components/chat/no-keys-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsPanel } from "@/components/consensus/settings-panel";
import { RoundsPanel } from "@/components/consensus/rounds-panel";
import { DualView } from "@/components/consensus/dual-view";
import { AutoScrollToggle } from "@/components/consensus/auto-scroll-toggle";
import { useModels } from "@/hooks/use-models";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CustomErrorToast } from "@/components/ui/custom-error-toast";
import type {
  ModelSelection,
  RoundData,
  ConsensusStreamEvent,
  ConsensusEvaluation,
} from "@/lib/types";

export default function ConsensusPage() {
  const [prompt, setPrompt] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Unified model catalog with availability filtering
  const {
    models,
    groupedModels,
    hasKeys,
    hasAnyKey,
    isLoading: modelsLoading,
    refetch,
  } = useModels();

  // Check for API key updates and refetch if needed
  useEffect(() => {
    const checkForKeyUpdates = () => {
      const lastUpdate = localStorage.getItem("apiKeysUpdated");
      const lastCheck = localStorage.getItem("apiKeysLastCheck");

      if (lastUpdate && lastUpdate !== lastCheck) {
        refetch();
        localStorage.setItem("apiKeysLastCheck", lastUpdate);
      }
    };

    checkForKeyUpdates();

    // Also check when window gains focus (user might have saved keys in another tab)
    window.addEventListener("focus", checkForKeyUpdates);
    return () => window.removeEventListener("focus", checkForKeyUpdates);
  }, [refetch]);

  // Auto-filter invalid selections whenever models list changes
  useEffect(() => {
    if (models.length === 0) return; // Wait for models to load

    setSelectedModels(prev => {
      const validSelections = prev.filter(selection =>
        models.some(model => model.id === selection.modelId)
      );

      // Only update if something changed to avoid infinite loops
      if (validSelections.length !== prev.length) {
        return validSelections;
      }
      return prev;
    });
  }, [models]);

  // Settings
  const [maxRounds, setMaxRounds] = useState(3);
  const [consensusThreshold, setConsensusThreshold] = useState(80);
  const [evaluatorModel, setEvaluatorModel] = useState("claude-3-7-sonnet-20250219");
  const [enableSearch, setEnableSearch] = useState(false);

  // Model selection (2-3 models)
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);

  // Workflow state
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentRoundResponses, setCurrentRoundResponses] = useState<Map<string, string>>(new Map());
  const [currentSearchData, setCurrentSearchData] = useState<import("@/lib/types").SearchData | null>(null);
  const [currentEvaluation, setCurrentEvaluation] = useState<Partial<ConsensusEvaluation> | null>(null);
  const [finalConsensus, setFinalConsensus] = useState<string | null>(null);
  const [finalResponses, setFinalResponses] = useState<Map<string, string> | null>(null);
  const [progressionSummary, setProgressionSummary] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [isGeneratingProgression, setIsGeneratingProgression] = useState(false);
  const [overallStatus, setOverallStatus] = useState<string | null>(null);

  // Counter to trigger auto-scroll on content updates
  const [scrollTrigger, setScrollTrigger] = useState(0);

  // Flag to reset rounds panel to current round
  const [shouldResetToCurrentRound, setShouldResetToCurrentRound] = useState(false);

  // Use refs to track latest values for event handling (avoids stale closures)
  const currentEvaluationRef = useRef<Partial<ConsensusEvaluation> | null>(null);
  const currentRoundResponsesRef = useRef<Map<string, string>>(new Map());
  const currentRoundRef = useRef<number>(0);
  const currentSearchDataRef = useRef<import("@/lib/types").SearchData | null>(null);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Auto-scroll hook
  const { scrollToBottom, enabled: autoScrollEnabled, isUserScrolling, toggleEnabled, pauseAutoScroll, resumeAutoScroll } = useAutoScroll();

  // Handler to resume auto-scroll and scroll to current round
  const handleResumeAutoScroll = useCallback(() => {
    // First, trigger the rounds panel to select the current round
    setShouldResetToCurrentRound(true);

    // Reset the flag after a brief moment so it can be triggered again later
    setTimeout(() => {
      setShouldResetToCurrentRound(false);
    }, 100);

    // Then resume auto-scroll
    resumeAutoScroll();
  }, [resumeAutoScroll]);

  // Initialize default models when models are loaded
  useEffect(() => {
    if (models.length > 0 && selectedModels.length === 0) {
      const defaultModels: ModelSelection[] = [];

      // Find a good Anthropic model (Claude Sonnet preferred)
      const anthropicModel = models.find(
        (m) => m.provider === "anthropic" && m.id.includes("sonnet")
      ) || models.find((m) => m.provider === "anthropic");

      // Find a good OpenAI model (GPT-4o preferred)
      const openaiModel = models.find(
        (m) => m.provider === "openai" && m.id.includes("gpt-4o")
      ) || models.find((m) => m.provider === "openai");

      if (anthropicModel) {
        defaultModels.push({
          id: "model-1",
          provider: "anthropic",
          modelId: anthropicModel.id,
          label: anthropicModel.shortName,
        });
      }

      if (openaiModel) {
        defaultModels.push({
          id: "model-2",
          provider: "openai",
          modelId: openaiModel.id,
          label: openaiModel.shortName,
        });
      }

      // Only initialize if we have at least 2 models
      if (defaultModels.length >= 2) {
        setSelectedModels(defaultModels);
      }
    }
  }, [models, selectedModels.length]);

  // Initialize default evaluator model when models are loaded
  useEffect(() => {
    if (models.length > 0 && evaluatorModel === "claude-3-7-sonnet-20250219") {
      // Filter evaluation-suitable models (exclude nano/mini/lite/flash)
      const suitableModels = models.filter((m) => {
        const lower = m.name.toLowerCase();
        return (
          !lower.includes("nano") &&
          !lower.includes(" mini") &&
          !lower.includes("-mini") &&
          !lower.includes("lite") &&
          !lower.includes("flash")
        );
      });

      // 1. Try to find GPT-4o-mini (good balance of cost/quality for evaluation)
      const gpt4oMini = suitableModels.find(
        (m) => m.provider === "openai" && m.id.includes("gpt-4o-mini")
      );

      // 2. Fall back to Claude Sonnet
      const claudeSonnet = suitableModels.find(
        (m) => m.provider === "anthropic" && m.id.includes("sonnet")
      );

      // 3. Otherwise use first suitable model
      if (gpt4oMini) {
        setEvaluatorModel(gpt4oMini.id);
      } else if (claudeSonnet) {
        setEvaluatorModel(claudeSonnet.id);
      } else if (suitableModels.length > 0) {
        setEvaluatorModel(suitableModels[0].id);
      }
    }
  }, [models, evaluatorModel]);

  // Auto-scroll: Trigger scroll when scrollTrigger increments
  useEffect(() => {
    if (scrollTrigger > 0 && (isProcessing || isSynthesizing || isGeneratingProgression)) {
      // Small delay to allow DOM to render new content
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [scrollTrigger, isProcessing, isSynthesizing, isGeneratingProgression, scrollToBottom]);

  function handleCancel() {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (timeoutIdRef.current) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    setIsProcessing(false);
    setIsSynthesizing(false);
    setIsGeneratingProgression(false);
    setOverallStatus(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!prompt.trim()) return;
    if (selectedModels.length < 2 || selectedModels.length > 3) {
      toast.error("Invalid model selection", {
        description: "Please select 2-3 models to continue.",
      });
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
    setCurrentSearchData(null);
    setCurrentEvaluation(null);
    setFinalConsensus(null);
    setFinalResponses(null);
    setProgressionSummary(null);
    setIsSynthesizing(false);
    setIsGeneratingProgression(false);
    setOverallStatus(null);
    currentRoundResponsesRef.current = new Map();
    currentEvaluationRef.current = null;
    currentSearchDataRef.current = null;

    // Re-enable auto-scroll when starting a new consensus request
    resumeAutoScroll();

    // Create abort controller for this request
    abortControllerRef.current = new AbortController();

    // Set client-side timeout safeguard (5 minutes - matches API maxDuration)
    // This is the last-resort failsafe; individual operations have their own timeouts
    timeoutIdRef.current = setTimeout(() => {
      // Only abort if there's still an active request
      if (abortControllerRef.current) {
        toast.error("Consensus timed out", {
          description: "The evaluation is taking too long. Please try again with different models.",
          duration: 8000,
        });
        handleCancel();
      }
    }, 300000);

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
          enableSearch,
        }),
        signal: abortControllerRef.current.signal,
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
      // Don't show error for user-initiated cancellation
      if (error.name === 'AbortError') {
        console.log("Consensus evaluation cancelled by user");
      } else {
        console.error("Error:", error);
        toast.error("Consensus failed", {
          description: error.message || "An error occurred. Please try again.",
          duration: 6000,
        });
      }
    } finally {
      setIsProcessing(false);
      setIsSynthesizing(false);
      setIsGeneratingProgression(false);
      setOverallStatus(null);
      // Clear timeout and abort controller when processing completes
      if (timeoutIdRef.current) {
        clearTimeout(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current = null;
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
        setCurrentSearchData(null);
        currentSearchDataRef.current = null;
        setOverallStatus(`Round ${event.data.roundNumber}: ${event.data.status}`);
        break;

      case "search-start":
        setOverallStatus(`Round ${event.round}: Searching web for "${event.query}"...`);
        break;

      case "search-complete":
        setOverallStatus(`Round ${event.round}: Search complete (${event.data.results.length} results)`);
        setCurrentSearchData(event.data);
        currentSearchDataRef.current = event.data;
        setScrollTrigger(prev => prev + 1);
        break;

      case "search-error":
        console.warn(`Search error in round ${event.round}:`, event.error);
        setOverallStatus(`Round ${event.round}: Search failed, continuing without web results`);
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
        // Trigger auto-scroll for streaming responses
        setScrollTrigger(prev => prev + 1);
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
        // Trigger auto-scroll for evaluation (agree/disagree sections)
        setScrollTrigger(prev => prev + 1);
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
            searchData: currentSearchDataRef.current || undefined,
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
            searchData: currentSearchDataRef.current || undefined,
          };
          setRounds((prev) => [...prev, roundData]);
        }
        setIsSynthesizing(true);
        setFinalConsensus("");
        setOverallStatus("Synthesizing final consensus response...");
        // Trigger auto-scroll when final results section appears
        setScrollTrigger(prev => prev + 1);
        break;

      case "synthesis-chunk":
        setFinalConsensus((prev) => (prev || "") + event.content);
        setOverallStatus("Generating final consensus...");
        // Trigger auto-scroll for streaming consensus
        setScrollTrigger(prev => prev + 1);
        break;

      case "progression-summary-start":
        setIsGeneratingProgression(true);
        setProgressionSummary("");
        setOverallStatus("Analyzing how consensus evolved...");
        // Trigger auto-scroll when Evolution of Consensus section appears
        setScrollTrigger(prev => prev + 1);
        break;

      case "progression-summary-chunk":
        setProgressionSummary((prev) => (prev || "") + event.content);
        setOverallStatus("Generating progression summary...");
        // Trigger auto-scroll for streaming progression summary
        setScrollTrigger(prev => prev + 1);
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
        console.warn(`Model error received:`, event.data);
        // Check if this is an OpenRouter privacy error
        if (event.data.errorType === 'openrouter-privacy') {
          toast.custom((id) => (
            <CustomErrorToast
              id={id}
              title="Model failed"
              description={`${event.data.modelLabel}: Enable "free endpoints that may publish prompts" in OpenRouter privacy settings to use free models.`}
              actionLabel="Open Settings"
              actionOnClick={() => window.open("https://openrouter.ai/settings/privacy", "_blank")}
            />
          ), { duration: Infinity });
        } else if (event.data.errorType === 'rate-limit') {
          // Check if this is a free model
          const isFreeModel = selectedModels.find(m => m.id === event.data.modelId)?.modelId.endsWith(':free');

          toast.custom((id) => (
            <CustomErrorToast
              id={id}
              title="Model rate limited"
              description={isFreeModel
                ? `${event.data.modelLabel} hit rate limits. Free models have shared rate limits - get your own API key or hide free models to avoid this.`
                : `${event.data.modelLabel} is temporarily rate-limited. Wait a moment and retry, or use your own API key for higher limits.`}
              actionLabel="Get API Key"
              actionOnClick={() => window.open("https://openrouter.ai/settings/integrations", "_blank")}
              cancelLabel={isFreeModel ? "Hide Free Models" : undefined}
              cancelOnClick={isFreeModel ? () => window.location.href = "/settings" : undefined}
            />
          ), { duration: Infinity });
        } else {
          toast.error(`${event.data.modelLabel} failed to respond`, {
            description: event.data.error,
            duration: 5000,
          });
        }
        break;

      case "complete":
        setOverallStatus("Complete!");
        setIsSynthesizing(false);
        setIsGeneratingProgression(false);
        setTimeout(() => setOverallStatus(null), 2000); // Clear after 2 seconds
        break;

      case "error":
        console.error("Consensus error:", event.data);
        toast.error("Consensus error", {
          description: event.data?.message || "An error occurred during consensus generation. Please try again.",
          duration: 8000,
        });
        setIsProcessing(false);
        setIsSynthesizing(false);
        setIsGeneratingProgression(false);
        setOverallStatus(null);
        break;
    }
  }

  // With OpenRouter, user has access to all model types
  const keyCount = hasKeys
    ? (hasKeys.openrouter ? 3 : [hasKeys.anthropic, hasKeys.openai, hasKeys.google].filter(Boolean).length)
    : 0;

  if (modelsLoading) {
    return (
      <div className="container py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  if (!hasAnyKey) {
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
      {/* Floating Status Indicator */}
      {overallStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-6 py-3 shadow-lg dark:border-blue-900 dark:bg-blue-950/95 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {overallStatus}
              </span>
            </div>
            <button
              onClick={handleCancel}
              className="text-sm font-medium text-blue-700 hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-10">

        {/* Input */}
        <div className="mx-auto w-full max-w-4xl">
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isProcessing || isSynthesizing || isGeneratingProgression}
            onSubmit={handleSubmit}
            onCancel={handleCancel}
          />
        </div>

        {/* Settings Panel */}
        {models.length > 0 && (
          <div className="mx-auto w-full max-w-4xl">
            <SettingsPanel
              availableKeys={hasKeys!}
              selectedModels={selectedModels}
              setSelectedModels={setSelectedModels}
              maxRounds={maxRounds}
              setMaxRounds={setMaxRounds}
              consensusThreshold={consensusThreshold}
              setConsensusThreshold={setConsensusThreshold}
              evaluatorModel={evaluatorModel}
              setEvaluatorModel={setEvaluatorModel}
              enableSearch={enableSearch}
              setEnableSearch={setEnableSearch}
              disabled={isProcessing}
              openRouterModels={models}
              openRouterGroupedModels={groupedModels}
              openRouterLoading={modelsLoading}
            />
          </div>
        )}

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
            currentSearchData={currentSearchData}
            currentEvaluation={currentEvaluation}
            onUserInteraction={pauseAutoScroll}
            resetToCurrentRound={shouldResetToCurrentRound}
          />
        )}

        {/* Final Results */}
        {(isSynthesizing || isGeneratingProgression || showResults) && (
          <DualView
            consensusContent={finalConsensus}
            finalResponses={finalResponses}
            selectedModels={selectedModels}
            isStreaming={isProcessing}
            progressionSummary={progressionSummary}
            isGeneratingProgression={isGeneratingProgression}
            isSynthesizing={isSynthesizing}
          />
        )}
      </div>

      {/* Auto-scroll toggle - show when there's content being generated */}
      <AutoScrollToggle
        enabled={autoScrollEnabled}
        onToggle={toggleEnabled}
        onResume={handleResumeAutoScroll}
        isUserScrolling={isUserScrolling}
        show={isProcessing || currentRound > 0}
      />
    </div>
  );
}
