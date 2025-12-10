"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { RoundData, ModelSelection } from "@/lib/types";

interface MetaConversationProps {
  rounds: RoundData[];
  selectedModels: ModelSelection[];
}

export function MetaConversation({ rounds, selectedModels }: MetaConversationProps) {
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
                      variant={round.evaluation.score >= 80 ? "default" : "secondary"}
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
                {/* Evaluation Section */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Evaluation</h4>
                  <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                    <div>
                      <span className="text-sm font-medium">Reasoning:</span>
                      <p className="text-sm text-muted-foreground mt-1">
                        {round.evaluation.reasoning}
                      </p>
                    </div>

                    {round.evaluation.keyDifferences.length > 0 && (
                      <div>
                        <span className="text-sm font-medium">Key Differences:</span>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {round.evaluation.keyDifferences.map((diff, i) => (
                            <li key={i} className="text-sm text-muted-foreground">
                              {diff}
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
                                p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                                ul: ({ node, ...props }) => <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />,
                                ol: ({ node, ...props }) => <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />,
                                li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                                h1: ({ node, ...props }) => <h1 className="mb-4 mt-6 text-2xl font-bold" {...props} />,
                                h2: ({ node, ...props }) => <h2 className="mb-3 mt-5 text-xl font-bold" {...props} />,
                                h3: ({ node, ...props }) => <h3 className="mb-3 mt-4 text-lg font-bold" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
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

                {/* Refinement Prompts (if available) */}
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
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
}
