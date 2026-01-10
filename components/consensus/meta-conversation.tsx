"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RoundData, ModelSelection } from "@/lib/types";

// Helper functions for styling
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

function getDifferenceIcon(score: number): string {
  if (score >= 75) return "💬";
  if (score >= 50) return "⚡";
  return "💥";
}

function getDifferenceTitle(score: number): string {
  if (score >= 75) return "Minor Differences";
  if (score >= 50) return "Where They Diverge";
  return "Big Disagreements!";
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

interface MetaConversationProps {
  rounds: RoundData[];
  selectedModels: ModelSelection[];
  consensusThreshold: number;
}

export function MetaConversation({ rounds, selectedModels, consensusThreshold }: MetaConversationProps) {
  // Track which accordion sections are expanded (persists across round switches)
  const [expandedSections, setExpandedSections] = useState({
    detailedAnalysis: true, // Expanded by default
    modelResponses: false,
    refinementPrompts: false,
  });

  if (rounds.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Meta-Conversation</CardTitle>
        <CardDescription>
          View how models refined their responses across rounds
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion type="single" collapsible className="w-full">
          {rounds.map((round) => (
            <AccordionItem key={round.roundNumber} value={`round-${round.roundNumber}`}>
              <AccordionTrigger className="hover:no-underline">
                <div className="flex items-center gap-4 w-full justify-between pr-4">
                  <span className="font-semibold">Round {round.roundNumber}</span>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="default"
                      className={`text-white ${
                        round.evaluation.score >= consensusThreshold
                          ? "bg-green-500 hover:bg-green-600"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                    >
                      Consensus: {round.evaluation.score}%
                    </Badge>
                    {round.evaluation.isGoodEnough && (
                      <Badge variant="outline" className="text-green-600">
                        ✓ Good Enough
                      </Badge>
                    )}
                  </div>
                </div>
              </AccordionTrigger>

              <AccordionContent className="space-y-6 pt-4">
                {/* Model Responses - Collapsible (placed before evaluation so streaming eval doesn't push it down) */}
                <Accordion
                  type="single"
                  collapsible
                  value={expandedSections.modelResponses ? "responses" : ""}
                  onValueChange={(value) => setExpandedSections(prev => ({
                    ...prev,
                    modelResponses: value === "responses"
                  }))}
                >
                  <AccordionItem value="responses" className="border-none">
                    <AccordionTrigger className="text-sm hover:no-underline">
                      <span className="flex items-center gap-2">💬 Individual Model Responses</span>
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
                            <div className="p-4 bg-muted/30 rounded-lg max-h-[400px] overflow-y-auto">
                              <div className="prose prose-sm dark:prose-invert max-w-none">
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

                {/* Evaluation Section - FUN VERSION */}
                <div className="space-y-4">
                  {/* Top Section: Compact Hero (left) + Differences (right) */}
                  <div className="flex gap-4">
                    {/* Left: Compact Score Hero - Fixed Square */}
                    <div className={`w-44 h-44 rounded-xl border-2 transition-all flex-shrink-0 flex items-center justify-center ${getVibeStyling(round.evaluation.vibe || getVibeFromScore(round.evaluation.score))}`}>
                      <div className="flex flex-col items-center gap-2 text-center">
                        {/* Giant Emoji */}
                        <div className="text-5xl leading-none" role="img" aria-label="consensus indicator">
                          {round.evaluation.emoji || getEmojiFromScore(round.evaluation.score)}
                        </div>

                        {/* Score */}
                        <div className={`text-3xl font-bold leading-none ${getScoreColor(round.evaluation.score)}`}>
                          {round.evaluation.score}%
                        </div>

                        {/* Vibe Badge */}
                        <Badge
                          variant={round.evaluation.score >= consensusThreshold ? "default" : "destructive"}
                          className="text-xs whitespace-nowrap"
                        >
                          {getVibeDisplayLabel(round.evaluation.vibe || getVibeFromScore(round.evaluation.score))}
                        </Badge>

                        {round.evaluation.isGoodEnough && (
                          <Badge className="bg-green-500 hover:bg-green-600 text-white text-xs whitespace-nowrap">
                            We did it!
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Right: Key Differences - With Drama! */}
                    {round.evaluation.keyDifferences.length > 0 && (
                      <div className={`p-4 rounded-lg flex-1 ${getDifferenceStyling(round.evaluation.score)}`}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-lg">{getDifferenceIcon(round.evaluation.score)}</span>
                          <span className="font-semibold">
                            {getDifferenceTitle(round.evaluation.score)}
                          </span>
                        </div>
                        <ul className="space-y-2">
                          {round.evaluation.keyDifferences.map((diff, i) => (
                            <li key={i} className="text-sm flex gap-2">
                              <span>→</span>
                              <span>{diff}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

                  {/* Punchy Summary - Full Width */}
                  {round.evaluation.summary && (
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-base font-medium italic">
                        {round.evaluation.summary}
                      </p>
                    </div>
                  )}

                  {/* Areas of Agreement - Full Width */}
                  {round.evaluation.areasOfAgreement && round.evaluation.areasOfAgreement.length > 0 && (
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">✅</span>
                        <span className="font-semibold text-green-900 dark:text-green-100">What They Agree On</span>
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

                  {/* Collapsible Detailed Reasoning */}
                  {round.evaluation.reasoning && (
                    <Accordion
                      type="single"
                      collapsible
                      value={expandedSections.detailedAnalysis ? "reasoning" : ""}
                      onValueChange={(value) => setExpandedSections(prev => ({
                        ...prev,
                        detailedAnalysis: value === "reasoning"
                      }))}
                    >
                      <AccordionItem value="reasoning" className="border-none">
                        <AccordionTrigger className="text-sm hover:no-underline">
                          <span className="flex items-center gap-2">📊 Detailed Analysis</span>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="p-4 bg-muted/50 rounded-lg">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {round.evaluation.reasoning}
                              </ReactMarkdown>
                            </div>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  )}
                </div>

                {/* Refinement Prompts - Collapsible */}
                {round.refinementPrompts && (
                  <Accordion
                    type="single"
                    collapsible
                    value={expandedSections.refinementPrompts ? "refinement" : ""}
                    onValueChange={(value) => setExpandedSections(prev => ({
                      ...prev,
                      refinementPrompts: value === "refinement"
                    }))}
                  >
                    <AccordionItem value="refinement" className="border-none">
                      <AccordionTrigger className="text-sm hover:no-underline">
                        <span className="flex items-center gap-2">🔄 Refinement Prompts</span>
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
                                <div className="markdown-content text-sm">
                                  <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                      p: ({ node, ...props }) => (
                                        <p className="mb-3 leading-relaxed" {...props} />
                                      ),
                                      ul: ({ node, ...props }) => (
                                        <ul className="mb-3 ml-6 list-disc space-y-1" {...props} />
                                      ),
                                      ol: ({ node, ...props }) => (
                                        <ol className="mb-3 ml-6 list-decimal space-y-1" {...props} />
                                      ),
                                      li: ({ node, ...props }) => (
                                        <li className="leading-relaxed" {...props} />
                                      ),
                                      h2: ({ node, ...props }) => (
                                        <h2 className="mb-2 mt-4 text-base font-bold" {...props} />
                                      ),
                                      strong: ({ node, ...props }) => (
                                        <strong className="font-semibold" {...props} />
                                      ),
                                      hr: ({ node, ...props }) => (
                                        <hr className="my-4 border-border" {...props} />
                                      ),
                                    }}
                                  >
                                    {round.refinementPrompts?.[model.id] || "No prompt"}
                                  </ReactMarkdown>
                                </div>
                              </div>
                            </TabsContent>
                          ))}
                        </Tabs>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
