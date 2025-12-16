"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { CheckCircle2, Circle, Loader2, Minus } from "lucide-react";
import type { RoundData, ModelSelection } from "@/lib/types";

// Helper functions for styling based on score and vibe
function getVibeStyling(vibe: string): string {
  switch (vibe) {
    case "celebration": return "border-green-500 bg-green-50 dark:bg-green-950/20";
    case "agreement": return "border-blue-500 bg-blue-50 dark:bg-blue-950/20";
    case "mixed": return "border-yellow-500 bg-yellow-50 dark:bg-yellow-950/20";
    case "disagreement": return "border-orange-500 bg-orange-50 dark:bg-orange-950/20";
    case "clash": return "border-red-500 bg-red-50 dark:bg-red-950/20";
    default: return "border-gray-300 bg-gray-50 dark:bg-gray-900/20";
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return "text-green-600 dark:text-green-400";
  if (score >= 75) return "text-blue-600 dark:text-blue-400";
  if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
  if (score >= 30) return "text-orange-600 dark:text-orange-400";
  return "text-red-600 dark:text-red-400";
}

function getDifferenceStyling(score: number): string {
  if (score >= 75) return "bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900";
  if (score >= 50) return "bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-900";
  return "bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900";
}


function getEmojiFromScore(score: number): string {
  if (score >= 90) return "🎉";
  if (score >= 75) return "👍";
  if (score >= 50) return "🤔";
  if (score >= 30) return "⚠️";
  return "💥";
}

function getVibeFromScore(score: number): "celebration" | "agreement" | "mixed" | "disagreement" | "clash" {
  if (score >= 90) return "celebration";
  if (score >= 75) return "agreement";
  if (score >= 50) return "mixed";
  if (score >= 30) return "disagreement";
  return "clash";
}

function getVibeDisplayLabel(vibe: string): string {
  switch (vibe) {
    case "celebration": return "Celebration";
    case "agreement": return "Agreement";
    case "mixed": return "Mixed";
    case "disagreement": return "Disagreement";
    case "clash": return "Clash";
    default: return vibe;
  }
}

interface RoundsPanelProps {
  currentRound: number;
  maxRounds: number;
  rounds: RoundData[];
  selectedModels: ModelSelection[];
  isSynthesizing?: boolean;
  isProcessing?: boolean;
  consensusThreshold: number;
  currentRoundResponses?: Map<string, string>;
  currentEvaluation?: Partial<import("@/lib/types").ConsensusEvaluation> | null;
  onUserInteraction?: () => void;
  resetToCurrentRound?: boolean;
}

export function RoundsPanel({
  currentRound,
  maxRounds,
  rounds,
  selectedModels,
  isSynthesizing = false,
  isProcessing = false,
  consensusThreshold,
  currentRoundResponses,
  currentEvaluation,
  onUserInteraction,
  resetToCurrentRound = false,
}: RoundsPanelProps) {
  const [selectedRoundTab, setSelectedRoundTab] = useState<string>("1");
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Track which accordion sections are expanded (persists across round switches)
  const [expandedSections, setExpandedSections] = useState({
    detailedAnalysis: true, // Expanded by default
    modelResponses: false,
    refinementPrompts: false,
  });

  // Auto-select current round when it changes (only if user hasn't manually collapsed)
  useEffect(() => {
    if (currentRound > 0 && !userHasInteracted) {
      setSelectedRoundTab(String(currentRound));
    }
  }, [currentRound, userHasInteracted]);

  // Reset to current round when requested (e.g., when resuming auto-scroll)
  useEffect(() => {
    if (resetToCurrentRound && currentRound > 0) {
      setSelectedRoundTab(String(currentRound));
      setUserHasInteracted(false);
    }
  }, [resetToCurrentRound, currentRound]);

  // Build list of all rounds including current round if it's being processed
  const allRounds = [...rounds];
  const hasCurrentRoundData = currentRoundResponses && currentRoundResponses.size > 0;

  // Add current round if it's being processed and not yet in rounds array
  if (isProcessing && hasCurrentRoundData && !rounds.find((r) => r.roundNumber === currentRound)) {
    // Only include evaluation if we actually have evaluation data
    const hasEvaluation = currentEvaluation && (currentEvaluation.score !== undefined && currentEvaluation.score !== null);

    allRounds.push({
      roundNumber: currentRound,
      responses: currentRoundResponses,
      evaluation: hasEvaluation ? {
        score: currentEvaluation.score!,
        summary: currentEvaluation.summary || "",
        emoji: currentEvaluation.emoji || getEmojiFromScore(currentEvaluation.score!),
        vibe: currentEvaluation.vibe || getVibeFromScore(currentEvaluation.score!),
        areasOfAgreement: currentEvaluation.areasOfAgreement || [],
        keyDifferences: currentEvaluation.keyDifferences || [],
        reasoning: currentEvaluation.reasoning || "",
        isGoodEnough: currentEvaluation.isGoodEnough || false,
      } : undefined as any, // Will be filtered out in display
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Rounds</CardTitle>
          <span className="text-sm text-muted-foreground">
            Round {currentRound} of {maxRounds}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Round Indicators */}
        <div className="flex items-center justify-between gap-2">
          {Array.from({ length: maxRounds }, (_, i) => {
            const roundNumber = i + 1;
            const isCompleted =
              roundNumber < currentRound ||
              rounds.some((r) => r.roundNumber === roundNumber) ||
              (isSynthesizing && roundNumber <= currentRound);
            const isCurrent = !isSynthesizing && currentRound === roundNumber && isProcessing;
            const isSkipped = !isProcessing && roundNumber > currentRound;
            const roundData = rounds.find((r) => r.roundNumber === roundNumber);
            // Make round clickable if it exists in allRounds (includes current in-progress round)
            const roundInAllRounds = allRounds.find((r) => r.roundNumber === roundNumber);
            const isClickable = roundInAllRounds !== undefined;

            const isSelected = selectedRoundTab === String(roundNumber);

            return (
              <button
                key={roundNumber}
                onClick={() => {
                  if (!isClickable) return;
                  setUserHasInteracted(true);
                  // Pause auto-scroll when user clicks on rounds
                  onUserInteraction?.();
                  // Toggle: if clicking selected round, collapse it
                  setSelectedRoundTab(isSelected ? "" : String(roundNumber));
                }}
                disabled={!isClickable}
                className={`flex flex-col items-center flex-1 p-2 rounded-lg transition-colors ${
                  isClickable ? "cursor-pointer hover:bg-muted/50" : "cursor-default"
                } ${
                  isSelected && isClickable ? "bg-muted" : ""
                }`}
              >
                {/* Round Circle */}
                <div className="relative">
                  {isCompleted ? (
                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                  ) : isCurrent ? (
                    <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                  ) : isSkipped ? (
                    <div className="h-8 w-8 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                      <Minus className="h-4 w-4 text-muted-foreground" />
                    </div>
                  ) : (
                    <Circle className="h-8 w-8 text-muted-foreground" />
                  )}
                </div>

                {/* Round Number */}
                <span className="text-xs mt-1 font-medium">R{roundNumber}</span>

                {/* Consensus Score Badge with Emoji */}
                <div className="mt-1 h-5">
                  {roundData && (
                    <Badge
                      variant="default"
                      className={`text-xs text-white ${
                        roundData.evaluation.score >= consensusThreshold
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {roundData.evaluation.emoji && <span className="mr-1">{roundData.evaluation.emoji}</span>}
                      {roundData.evaluation.score}%
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Bar with Gradients */}
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden flex">
          {Array.from({ length: maxRounds }, (_, i) => {
            const roundNumber = i + 1;
            const roundData = rounds.find((r) => r.roundNumber === roundNumber);
            const segmentWidth = `${100 / maxRounds}%`;

            let segmentColor = "bg-gray-300";
            if (roundData) {
              // Use gradient for dramatic effect based on score
              if (roundData.evaluation.score >= 90) {
                segmentColor = "bg-gradient-to-r from-green-500 to-green-400";
              } else if (roundData.evaluation.score >= 75) {
                segmentColor = "bg-gradient-to-r from-blue-500 to-blue-400";
              } else if (roundData.evaluation.score >= 50) {
                segmentColor = "bg-gradient-to-r from-yellow-500 to-yellow-400";
              } else if (roundData.evaluation.score >= 30) {
                segmentColor = "bg-gradient-to-r from-orange-500 to-orange-400";
              } else {
                segmentColor = "bg-gradient-to-r from-red-500 to-red-400";
              }
            }

            return (
              <div
                key={roundNumber}
                className={`h-full transition-all duration-500 ${segmentColor}`}
                style={{ width: segmentWidth }}
              />
            );
          })}
        </div>

        {/* Round Details Tabs */}
        {allRounds.length > 0 && selectedRoundTab && (
          <Tabs value={selectedRoundTab} onValueChange={setSelectedRoundTab} className="w-full">
            <TabsList className="hidden">
              {allRounds.map((round) => (
                <TabsTrigger key={round.roundNumber} value={String(round.roundNumber)}>
                  Round {round.roundNumber}
                </TabsTrigger>
              ))}
            </TabsList>

            {allRounds.map((round) => (
              <TabsContent
                key={round.roundNumber}
                value={String(round.roundNumber)}
                className="space-y-6 mt-0"
              >
                {/* Evaluation Section - FUN VERSION (only show if we have evaluation data) */}
                {round.evaluation && round.evaluation.score !== undefined && round.evaluation.score !== null && (
                  <div className="space-y-4">
                  {/* Punchy Summary - Full Width */}
                  {round.evaluation.summary && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-base font-medium italic">
                        {round.evaluation.summary}
                      </p>
                    </div>
                  )}

                  {/* Two Column Layout: Agreements (left) + Differences (right) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Left: Areas of Agreement */}
                    {round.evaluation.areasOfAgreement && round.evaluation.areasOfAgreement.length > 0 && (
                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">✅</span>
                          <span className="font-semibold text-green-900 dark:text-green-100">
                            What They Agree On
                          </span>
                        </div>
                        <ul className="space-y-1">
                          {round.evaluation.areasOfAgreement.map((agreement, i) => (
                            <li key={i} className="text-sm text-green-800 dark:text-green-200 flex gap-2">
                              <span>•</span>
                              <span>{agreement}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Right: Key Differences */}
                    {round.evaluation.keyDifferences.length > 0 && (
                      <div className={`p-4 rounded-lg ${getDifferenceStyling(round.evaluation.score)}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">⚠️</span>
                          <span className="font-semibold">
                            Key Differences
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {round.evaluation.keyDifferences.map((diff, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span>•</span>
                              <span>{diff}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Detailed Reasoning */}
                  {round.evaluation.reasoning && (
                    <Accordion
                      type="single"
                      collapsible
                      value={expandedSections.detailedAnalysis ? "reasoning" : ""}
                      onValueChange={(value) => {
                        onUserInteraction?.();
                        setExpandedSections(prev => ({
                          ...prev,
                          detailedAnalysis: value === "reasoning"
                        }));
                      }}
                    >
                      <AccordionItem value="reasoning">
                        <AccordionTrigger className="text-sm hover:no-underline">
                          <span className="flex items-center gap-2">
                            📊 Detailed Analysis
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                components={{
                                  p: ({ node, ...props }) => (
                                    <p className="mb-2 leading-relaxed" {...props} />
                                  ),
                                  ul: ({ node, ...props }) => (
                                    <ul className="mb-2 ml-6 list-disc space-y-1" {...props} />
                                  ),
                                  ol: ({ node, ...props }) => (
                                    <ol className="mb-2 ml-6 list-decimal space-y-1" {...props} />
                                  ),
                                  li: ({ node, ...props }) => (
                                    <li className="leading-relaxed" {...props} />
                                  ),
                                  strong: ({ node, ...props }) => (
                                    <strong className="font-bold" {...props} />
                                  ),
                                  code: ({ node, ...props }) => (
                                    <code className="bg-muted px-1 py-0.5 rounded text-sm" {...props} />
                                  ),
                                }}
                              >
                                {round.evaluation.reasoning}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                  </div>
                )}

                {/* Model Responses - Collapsible */}
                <Accordion
                  type="single"
                  collapsible
                  value={expandedSections.modelResponses ? "responses" : ""}
                  onValueChange={(value) => {
                    onUserInteraction?.();
                    setExpandedSections(prev => ({
                      ...prev,
                      modelResponses: value === "responses"
                    }));
                  }}
                >
                  <AccordionItem value="responses">
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="flex items-center gap-2">
                        💬 Model Responses
                      </span>
                    </AccordionTrigger>
                    <AccordionContent>
                      <Tabs defaultValue={selectedModels[0]?.id} className="w-full">
                        <TabsList className="w-full">
                          {selectedModels.map((model) => (
                            <TabsTrigger key={model.id} value={model.id} className="flex-1">
                              {model.label}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                        {selectedModels.map((model) => (
                          <TabsContent key={model.id} value={model.id} className="mt-4">
                            <div className="p-4 bg-muted/30 rounded-lg max-h-[500px] overflow-y-auto">
                              <div className="markdown-content">
                                <ReactMarkdown
                                  remarkPlugins={[remarkGfm]}
                                  components={{
                                    p: ({ node, ...props }) => (
                                      <p className="mb-4 leading-relaxed" {...props} />
                                    ),
                                    ul: ({ node, ...props }) => (
                                      <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />
                                    ),
                                    ol: ({ node, ...props }) => (
                                      <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />
                                    ),
                                    li: ({ node, ...props }) => (
                                      <li className="leading-relaxed" {...props} />
                                    ),
                                    h1: ({ node, ...props }) => (
                                      <h1 className="mb-4 mt-6 text-2xl font-bold" {...props} />
                                    ),
                                    h2: ({ node, ...props }) => (
                                      <h2 className="mb-3 mt-5 text-xl font-bold" {...props} />
                                    ),
                                    h3: ({ node, ...props }) => (
                                      <h3 className="mb-3 mt-4 text-lg font-bold" {...props} />
                                    ),
                                    strong: ({ node, ...props }) => (
                                      <strong className="font-bold" {...props} />
                                    ),
                                  }}
                                >
                                  {round.responses.get(model.id) || "No response"}
                                </ReactMarkdown>
                              </div>
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                {/* Refinement Prompts - Collapsible */}
                {round.refinementPrompts && (
                  <Accordion
                    type="single"
                    collapsible
                    value={expandedSections.refinementPrompts ? "refinement" : ""}
                    onValueChange={(value) => {
                      onUserInteraction?.();
                      setExpandedSections(prev => ({
                        ...prev,
                        refinementPrompts: value === "refinement"
                      }));
                    }}
                  >
                    <AccordionItem value="refinement">
                      <AccordionTrigger className="text-sm hover:no-underline">
                        <span className="flex items-center gap-2">
                          🔄 Refinement Prompts
                        </span>
                      </AccordionTrigger>
                      <AccordionContent>
                        <Tabs defaultValue={selectedModels[0]?.id} className="w-full">
                          <TabsList className="w-full">
                            {selectedModels.map((model) => (
                              <TabsTrigger key={model.id} value={model.id} className="flex-1">
                                {model.label}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                          {selectedModels.map((model) => (
                            <TabsContent key={model.id} value={model.id} className="mt-4">
                              <div className="p-4 bg-muted/30 rounded-lg">
                                <pre className="text-xs whitespace-pre-wrap font-mono">
                                  {round.refinementPrompts?.[model.id] || "No prompt"}
                                </pre>
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
