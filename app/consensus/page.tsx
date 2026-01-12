"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { ConsensusHeader } from "@/components/consensus/consensus-header";
import { ConsensusInput } from "@/components/consensus/consensus-input";
import { NoKeysAlert } from "@/components/consensus/no-keys-alert";
import { Skeleton } from "@/components/ui/skeleton";
import { SettingsPanel } from "@/components/consensus/settings-panel";
import { RoundsPanel } from "@/components/consensus/rounds-panel";
import { DualView } from "@/components/consensus/dual-view";
import { AutoScrollToggle } from "@/components/consensus/auto-scroll-toggle";
import { useModels } from "@/hooks/use-models";
import { useAutoScroll } from "@/hooks/use-auto-scroll";
import { usePreviewStatus } from "@/hooks/use-preview-status";
import { PreviewStatusBanner, PreviewExhaustedCard } from "@/components/preview";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { CustomErrorToast } from "@/components/ui/custom-error-toast";
import posthog from "posthog-js";
import { PRESETS, resolvePreset, type PresetId } from "@/lib/presets";
import { PREVIEW_PRESET, resolvePreviewPreset } from "@/lib/preview-preset";
import type {
  ModelSelection,
  RoundData,
  ConsensusStreamEvent,
  ConsensusEvaluation,
} from "@/lib/types";

const EMPTY_KEYS = {
  anthropic: false,
  openai: false,
  google: false,
  tavily: false,
  openrouter: false,
} as const;

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

  // Preview status (for users without API keys)
  const { status: previewStatus, isLoading: previewLoading, decrementRun: decrementPreviewRun } = usePreviewStatus();

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

  // Preset state - track last selected preset and its model IDs
  const [selectedPresetId, setSelectedPresetId] = useState<PresetId | null>(null);
  const [presetModelIds, setPresetModelIds] = useState<string[]>([]);

  // Settings
  const [maxRounds, setMaxRounds] = useState(3);
  const [consensusThreshold, setConsensusThreshold] = useState(80);
  const [evaluatorModel, setEvaluatorModel] = useState("claude-3-7-sonnet-20250219");
  const [enableSearch, setEnableSearch] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(true);

  // Model selection (2-3 models)
  const [selectedModels, setSelectedModels] = useState<ModelSelection[]>([]);

  // Compute if current settings match the selected preset (for display)
  const activePreset = useMemo(() => {
    if (!selectedPresetId) return null;

    const preset = PRESETS[selectedPresetId];
    if (!preset) return null;

    // Check process settings
    if (
      maxRounds !== preset.maxRounds ||
      consensusThreshold !== preset.consensusThreshold ||
      enableSearch !== (preset.enableSearch ?? false)
    ) {
      return null;
    }

    // Check models match what preset selected
    const currentModelIds = selectedModels.map(m => m.modelId).sort();
    const expectedModelIds = [...presetModelIds].sort();
    if (
      currentModelIds.length !== expectedModelIds.length ||
      currentModelIds.some((id, i) => id !== expectedModelIds[i])
    ) {
      return null;
    }

    return selectedPresetId;
  }, [selectedPresetId, maxRounds, consensusThreshold, enableSearch, selectedModels, presetModelIds]);

  // Workflow state
  const [rounds, setRounds] = useState<RoundData[]>([]);
  const [currentRound, setCurrentRound] = useState(0);
  const [currentRoundResponses, setCurrentRoundResponses] = useState<Map<string, string>>(new Map());
  const [completedModels, setCompletedModels] = useState<Set<string>>(new Set());
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
  const previewRefetchedRef = useRef<boolean>(false);

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

  // Apply a preset - sets all settings at once
  // Returns the resolved configuration for immediate use (since setState is async)
  const applyPreset = useCallback((presetId: PresetId): {
    models: ModelSelection[];
    maxRounds: number;
    consensusThreshold: number;
    evaluatorModel: string;
    enableSearch: boolean;
  } | null => {
    if (models.length === 0) return null;

    try {
      const resolved = resolvePreset(presetId, models);
      const preset = resolved.preset;

      // Set settings from preset
      setMaxRounds(preset.maxRounds);
      setConsensusThreshold(preset.consensusThreshold);
      setEnableSearch(preset.enableSearch || false);

      // Set selected models
      const modelSelections: ModelSelection[] = resolved.selectedModels.map((m, i) => ({
        id: `model-${i + 1}`,
        provider: m.provider,
        modelId: m.id,
        label: m.shortName,
      }));
      setSelectedModels(modelSelections);

      // Set evaluator model
      const evaluatorId = resolved.evaluatorModel?.id ?? evaluatorModel;
      if (resolved.evaluatorModel) {
        setEvaluatorModel(evaluatorId);
      }

      // Update preset state
      setSelectedPresetId(presetId);
      setPresetModelIds(modelSelections.map(m => m.modelId));

      // Track preset selection
      posthog.capture("preset_selected", {
        preset_id: presetId,
        preset_name: preset.name,
        model_count: preset.modelCount,
        selected_models: modelSelections.map(m => m.modelId),
        evaluator_model: evaluatorId,
      });

      // Return resolved config for immediate use
      return {
        models: modelSelections,
        maxRounds: preset.maxRounds,
        consensusThreshold: preset.consensusThreshold,
        evaluatorModel: evaluatorId,
        enableSearch: preset.enableSearch || false,
      };
    } catch (error) {
      console.error("Failed to apply preset:", error);
      toast.error("Could not apply preset", {
        description: "Not enough models available for this preset.",
      });
      return null;
    }
  }, [models, evaluatorModel]);

  // Initialize with appropriate preset on first load (only if no saved preferences)
  useEffect(() => {
    if (models.length === 0 || selectedModels.length > 0) return;

    // Check if user has saved preferences
    try {
      const stored = localStorage.getItem("consensusPreferences");
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.models && prefs.models.length >= 2) {
          // User has saved preferences, skip preset initialization
          return;
        }
      }
    } catch {
      // If localStorage fails, continue with preset
    }

    // In preview mode, use preview preset values directly
    // Otherwise use "balanced" preset
    const inPreviewMode = !hasAnyKey && previewStatus?.enabled && (previewStatus?.runsRemaining ?? 0) > 0;

    if (inPreviewMode) {
      // Apply preview preset directly (uses PREVIEW_PRESET values like 95% threshold)
      const resolved = resolvePreviewPreset(models);
      setMaxRounds(PREVIEW_PRESET.maxRounds);
      setConsensusThreshold(PREVIEW_PRESET.consensusThreshold);
      setEnableSearch(false);

      const modelSelections: ModelSelection[] = resolved.selectedModels.map((m, i) => ({
        id: `model-${i + 1}`,
        provider: m.provider,
        modelId: m.id,
        label: m.shortName,
      }));
      setSelectedModels(modelSelections);

      if (resolved.evaluatorModel) {
        setEvaluatorModel(resolved.evaluatorModel.id);
      }

      setSelectedPresetId("casual"); // Show as casual in UI
      setPresetModelIds(modelSelections.map(m => m.modelId));
      setSettingsExpanded(false);
    } else {
      applyPreset("balanced");
    }
  }, [models, selectedModels.length, applyPreset, hasAnyKey, previewStatus]);

  // Initialize default models when models are loaded (only if no saved preferences)
  useEffect(() => {
    if (models.length > 0 && selectedModels.length === 0) {
      // Check if user has saved preferences - if so, let SettingsPanel handle restoration
      try {
        const stored = localStorage.getItem("consensusPreferences");
        if (stored) {
          const prefs = JSON.parse(stored);
          if (prefs.models && prefs.models.length >= 2) {
            // User has saved preferences, skip setting defaults
            return;
          }
        }
      } catch {
        // If localStorage fails, continue with defaults
      }

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

  // Initialize default evaluator model when models are loaded (only if no saved preferences)
  useEffect(() => {
    if (models.length > 0 && evaluatorModel === "claude-3-7-sonnet-20250219") {
      // Check if user has saved preferences - if so, let SettingsPanel handle restoration
      try {
        const stored = localStorage.getItem("consensusPreferences");
        if (stored) {
          const prefs = JSON.parse(stored);
          if (prefs.evaluatorModel) {
            // User has saved preferences, skip setting defaults
            return;
          }
        }
      } catch {
        // If localStorage fails, continue with defaults
      }

      // In preview mode, prefer GPT-4o-mini (cheaper) as evaluator
      const inPreviewMode = !hasAnyKey && previewStatus?.enabled && (previewStatus?.runsRemaining ?? 0) > 0;

      if (inPreviewMode && models.length > 0) {
        const gpt4oMini = models.find(m => m.id.includes("gpt-4o-mini"));
        const chosen = gpt4oMini?.id ?? models[0].id;
        setEvaluatorModel(chosen);
        return;
      }

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
      } else if (models.length > 0) {
        // Fallback: use any available model
        setEvaluatorModel(models[0].id);
      }
    }
  }, [models, evaluatorModel, hasAnyKey, previewStatus]);

  // Restore selectedPresetId and presetModelIds from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("consensusPreferences");
      if (stored) {
        const prefs = JSON.parse(stored);
        if (prefs.activePreset) {
          setSelectedPresetId(prefs.activePreset);
        }
        if (prefs.presetModelIds) {
          setPresetModelIds(prefs.presetModelIds);
        }
      }
    } catch {
      // If localStorage fails, leave preset state as null
    }
  }, []);

  // Auto-scroll: Trigger scroll when scrollTrigger increments
  useEffect(() => {
    if (scrollTrigger > 0 && (isProcessing || isSynthesizing || isGeneratingProgression)) {
      // Small delay to allow DOM to render new content
      setTimeout(() => scrollToBottom(), 50);
    }
  }, [scrollTrigger, isProcessing, isSynthesizing, isGeneratingProgression, scrollToBottom]);

  function handleCancel() {
    // Track consensus cancellation
    posthog.capture("consensus_cancelled", {
      current_round: currentRoundRef.current,
      max_rounds: maxRounds,
      model_count: selectedModels.length,
    });

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

  // Optional override config for when we need to use freshly-resolved preset values
  // (since setState is async and the state won't be updated yet)
  interface SubmitConfig {
    models: ModelSelection[];
    maxRounds: number;
    consensusThreshold: number;
    evaluatorModel: string;
    enableSearch: boolean;
  }

  async function submitConsensus(promptValue: string, overrideConfig?: SubmitConfig) {
    // Use override config if provided (for preset+submit), otherwise use state
    const modelsToUse = overrideConfig?.models ?? selectedModels;
    const maxRoundsToUse = overrideConfig?.maxRounds ?? maxRounds;
    const thresholdToUse = overrideConfig?.consensusThreshold ?? consensusThreshold;
    const evaluatorToUse = overrideConfig?.evaluatorModel ?? evaluatorModel;
    const searchToUse = overrideConfig?.enableSearch ?? enableSearch;

    if (!promptValue.trim()) return;
    if (modelsToUse.length < 2 || modelsToUse.length > 3) {
      toast.error("Invalid model selection", {
        description: "Please select 2-3 models to continue.",
      });
      return;
    }

    // Track consensus started (conversion event)
    posthog.capture("consensus_started", {
      model_count: modelsToUse.length,
      models: modelsToUse.map(m => m.modelId),
      evaluator_model: evaluatorToUse,
      max_rounds: maxRoundsToUse,
      consensus_threshold: thresholdToUse,
      search_enabled: searchToUse,
      prompt_length: promptValue.length,
    });

    setIsProcessing(true);
    setRounds([]);
    setCurrentRound(0);
    setCurrentRoundResponses(new Map());
    setCompletedModels(new Set());
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

    // Set client-side timeout safeguard (10 minutes - matches API maxDuration)
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
    }, 600000);

    try {
      const response = await fetch("/api/consensus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptValue,
          models: modelsToUse,
          maxRounds: maxRoundsToUse,
          consensusThreshold: thresholdToUse,
          evaluatorModel: evaluatorToUse,
          enableSearch: searchToUse,
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
        // Track consensus error
        posthog.capture("consensus_error", {
          error_message: error.message || "Unknown error",
          current_round: currentRoundRef.current,
          max_rounds: maxRoundsToUse,
          model_count: modelsToUse.length,
          models: modelsToUse.map(m => m.modelId),
          evaluator_model: evaluatorToUse,
          consensus_threshold: thresholdToUse,
          search_enabled: searchToUse,
        });
        posthog.captureException(error);
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    submitConsensus(prompt);
  }

  // Handle submission with preset - applies preset and submits atomically
  function handleSubmitWithPreset(promptValue: string, presetId: PresetId) {
    const config = applyPreset(presetId);
    if (config) {
      submitConsensus(promptValue, config);
    }
  }

  function handleStreamEvent(event: ConsensusStreamEvent) {
    switch (event.type) {
      case "start":
        setConversationId(event.conversationId);
        setOverallStatus("Starting consensus generation...");
        previewRefetchedRef.current = false; // Reset for new run
        break;

      case "round-status":
        setCurrentRound(event.data.roundNumber);
        currentRoundRef.current = event.data.roundNumber;
        setCurrentRoundResponses(new Map());
        currentRoundResponsesRef.current = new Map();
        setCompletedModels(new Set());
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
        // nosemgrep: javascript.lang.security.audit.unsafe-formatstring.unsafe-formatstring
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

      case "model-complete":
        setCompletedModels((prev) => {
          const updated = new Set(prev);
          updated.add(event.data.modelId);
          return updated;
        });
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
              needsMoreInfo: currentEvaluationRef.current.needsMoreInfo || false,
              suggestedSearchQuery: currentEvaluationRef.current.suggestedSearchQuery || "",
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
              needsMoreInfo: currentEvaluationRef.current.needsMoreInfo || false,
              suggestedSearchQuery: currentEvaluationRef.current.suggestedSearchQuery || "",
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
        // Decrement preview run count on first chunk (instant UI update)
        if (!previewRefetchedRef.current) {
          previewRefetchedRef.current = true;
          decrementPreviewRun();
        }
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
        // Track model error in PostHog
        posthog.capture("model_error", {
          model_id: event.data.modelId,
          model_label: event.data.modelLabel,
          error_message: event.data.error,
          error_type: event.data.errorType || "unknown",
          round: event.data.round,
          all_models: selectedModels.map(m => m.modelId),
          evaluator_model: evaluatorModel,
        });
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
          // Check if this is a free model (OpenRouter free tier)
          const isFreeModel = selectedModels.find(m => m.id === event.data.modelId)?.modelId.endsWith(':free');

          if (isFreeModel) {
            // Free models have shared rate limits - suggest getting own key
            toast.custom((id) => (
              <CustomErrorToast
                id={id}
                title="Model rate limited"
                description={`${event.data.modelLabel} hit rate limits. Free models have shared rate limits - get your own API key or hide free models to avoid this.`}
                actionLabel="Get API Key"
                actionOnClick={() => window.open("https://openrouter.ai/settings/integrations", "_blank")}
                cancelLabel="Hide Free Models"
                cancelOnClick={() => window.location.href = "/settings"}
              />
            ), { duration: Infinity });
          } else {
            // User's own key hit rate limits - just inform them
            toast.error(`${event.data.modelLabel} rate limited`, {
              description: "Wait a moment and try again, or try a different model.",
              duration: 8000,
            });
          }
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

        // Track consensus completed
        const finalScore = currentEvaluationRef.current?.score ?? 0;
        posthog.capture("consensus_completed", {
          total_rounds: currentRoundRef.current,
          max_rounds: maxRounds,
          model_count: selectedModels.length,
          models: selectedModels.map(m => m.modelId),
          evaluator_model: evaluatorModel,
          final_score: finalScore,
          consensus_threshold: consensusThreshold,
          reached_consensus: finalScore >= consensusThreshold,
          search_enabled: enableSearch,
        });
        break;

      case "error":
        console.error("Consensus error:", event.data);
        // Track stream error in PostHog (different from client-side consensus_error)
        posthog.capture("consensus_stream_error", {
          error_message: event.data?.message || "Unknown stream error",
          current_round: event.data?.round || currentRoundRef.current,
          max_rounds: maxRounds,
          model_count: selectedModels.length,
          models: selectedModels.map(m => m.modelId),
          evaluator_model: evaluatorModel,
          consensus_threshold: consensusThreshold,
        });
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

  // Determine if user is in preview mode (no keys but preview available)
  const isPreviewMode = !hasAnyKey && previewStatus?.enabled && (previewStatus?.runsRemaining ?? 0) > 0;

  // Preview exhausted: had preview access but used all runs
  const isPreviewExhausted = !hasAnyKey && !!previewStatus?.enabled && (previewStatus?.runsRemaining ?? 0) === 0;

  // Keep showing UI if we have results or are processing (even if preview just hit 0)
  const hasActiveSession = isProcessing || finalConsensus !== null;

  // Build preview constraints for PresetSelector when in preview mode
  const previewConstraints = isPreviewMode && previewStatus?.constraints ? {
    maxRounds: previewStatus.constraints.maxRounds,
    maxParticipants: previewStatus.constraints.maxParticipants,
    allowsSearch: false, // Preview doesn't support search
  } : null;

  if (modelsLoading || previewLoading) {
    return (
      <div className="container py-4 md:py-8 px-2 md:px-4">
        <div className="flex min-h-[400px] items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  // No keys and no preview available - show upgrade prompt
  // But keep showing UI if we have an active session (processing or results)
  if (!hasAnyKey && !isPreviewMode && !hasActiveSession) {
    return (
      <div className="container py-4 md:py-12 px-2 md:px-4">
        <div className="space-y-6">
          {/* Hide header when showing PreviewExhaustedCard - card is self-contained */}
          {!isPreviewExhausted && <ConsensusHeader keyCount={keyCount} />}
          {isPreviewExhausted ? (
            <PreviewExhaustedCard />
          ) : (
            <NoKeysAlert />
          )}
        </div>
      </div>
    );
  }

  const showResults = finalConsensus !== null && finalResponses !== null;

  return (
    <div className="container py-4 md:py-12 px-2 md:px-4">
      {/* Floating Status Indicator */}
      {overallStatus && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-full max-w-md px-4">
          <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-accent px-6 py-3 shadow-lg">
            <div className="flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-accent-foreground" />
              <span className="text-sm font-medium text-accent-foreground">
                {overallStatus}
              </span>
            </div>
            <button
              onClick={handleCancel}
              className="text-sm font-medium text-accent-foreground/70 hover:text-accent-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="space-y-3">

        {/* Preview Status Banner - show during preview mode OR when exhausted with active session */}
        {(isPreviewMode || (isPreviewExhausted && hasActiveSession)) && (
          <div className="mx-auto w-full max-w-4xl">
            <PreviewStatusBanner status={previewStatus} isLoading={previewLoading} />
          </div>
        )}

        {/* Input */}
        <div className="mx-auto w-full max-w-4xl">
          <ConsensusInput
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isProcessing || isSynthesizing || isGeneratingProgression}
            onSubmit={handleSubmit}
            onSubmitWithPrompt={submitConsensus}
            onPresetSelect={applyPreset}
            onSubmitWithPreset={handleSubmitWithPreset}
            showSuggestions={!finalConsensus && !isPreviewExhausted}
            isPreviewMode={isPreviewMode}
            isPreviewExhausted={isPreviewExhausted}
          />
        </div>

        {/* Settings Panel (includes Preset Selector) */}
        {models.length > 0 && (
          <div className="mx-auto w-full max-w-4xl">
            <SettingsPanel
              availableKeys={hasKeys ?? EMPTY_KEYS}
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
              disabled={isProcessing || isSynthesizing || isGeneratingProgression || isPreviewExhausted}
              isProcessing={isProcessing || isSynthesizing || isGeneratingProgression}
              isExpanded={settingsExpanded}
              setIsExpanded={setSettingsExpanded}
              openRouterModels={models}
              openRouterGroupedModels={groupedModels}
              openRouterLoading={modelsLoading}
              activePreset={activePreset}
              presetModelIds={presetModelIds}
              onPresetSelect={applyPreset}
              previewConstraints={previewConstraints}
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
            completedModels={completedModels}
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
