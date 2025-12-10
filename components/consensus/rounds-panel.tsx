"use client";

import { useState, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Circle, Loader2, Minus } from "lucide-react";
import type { RoundData, ModelSelection } from "@/lib/types";

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
}: RoundsPanelProps) {
  const [selectedRoundTab, setSelectedRoundTab] = useState<string>("1");
  const [userHasInteracted, setUserHasInteracted] = useState(false);

  // Auto-select current round when it changes (only if user hasn't manually collapsed)
  useEffect(() => {
    if (currentRound > 0 && !userHasInteracted) {
      setSelectedRoundTab(String(currentRound));
    }
  }, [currentRound, userHasInteracted]);

  // Build list of all rounds including current round if it's being processed
  const allRounds = [...rounds];
  const hasCurrentRoundData = currentRoundResponses && currentRoundResponses.size > 0;

  // Add current round if it's being processed and not yet in rounds array
  if (isProcessing && hasCurrentRoundData && !rounds.find((r) => r.roundNumber === currentRound)) {
    allRounds.push({
      roundNumber: currentRound,
      responses: currentRoundResponses,
      evaluation: {
        score: currentEvaluation?.score || 0,
        reasoning: currentEvaluation?.reasoning || "",
        keyDifferences: currentEvaluation?.keyDifferences || [],
        isGoodEnough: currentEvaluation?.isGoodEnough || false,
      },
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
            const isClickable = roundData !== undefined;

            const isSelected = selectedRoundTab === String(roundNumber);

            return (
              <button
                key={roundNumber}
                onClick={() => {
                  if (!isClickable) return;
                  setUserHasInteracted(true);
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

                {/* Consensus Score Badge */}
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
                      {roundData.evaluation.score}%
                    </Badge>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-secondary h-2 rounded-full overflow-hidden flex">
          {Array.from({ length: maxRounds }, (_, i) => {
            const roundNumber = i + 1;
            const roundData = rounds.find((r) => r.roundNumber === roundNumber);
            const segmentWidth = `${100 / maxRounds}%`;

            let segmentColor = "bg-gray-300";
            if (roundData) {
              segmentColor =
                roundData.evaluation.score >= consensusThreshold
                  ? "bg-green-500"
                  : "bg-red-500";
            }

            return (
              <div
                key={roundNumber}
                className={`h-full transition-all duration-300 ${segmentColor}`}
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
                {/* Evaluation Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold text-sm">Evaluation</h4>
                    <Badge
                      variant="default"
                      className={`text-xs text-white ${
                        round.evaluation.score >= consensusThreshold
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      {round.evaluation.score}%
                    </Badge>
                    {round.evaluation.isGoodEnough && (
                      <Badge variant="outline" className="text-green-600 text-xs">
                        ✓ Good Enough
                      </Badge>
                    )}
                  </div>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    {round.evaluation.reasoning && (
                      <div>
                        <span className="text-sm font-medium">Reasoning:</span>
                        <div className="text-sm text-muted-foreground mt-1 markdown-content">
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
                    )}

                    {round.evaluation.keyDifferences.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Key Differences:</span>
                        <ul className="mt-1 space-y-1">
                          {round.evaluation.keyDifferences.map((diff, i) => (
                            <li key={i} className="text-sm text-muted-foreground flex gap-2">
                              <span className="text-muted-foreground">•</span>
                              <span className="flex-1">{diff}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Model Responses */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Model Responses</h4>
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
                </div>

                {/* Refinement Prompts */}
                {round.refinementPrompts && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Refinement Prompts</h4>
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
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
