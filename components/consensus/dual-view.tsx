"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ProgressionSummary } from "./progression-summary";
import type { ModelSelection } from "@/lib/types";

interface DualViewProps {
  consensusContent: string;
  finalResponses: Map<string, string>;
  selectedModels: ModelSelection[];
  isStreaming: boolean;
  progressionSummary?: string | null;
  isGeneratingProgression?: boolean;
}

export function DualView({
  consensusContent,
  finalResponses,
  selectedModels,
  isStreaming,
  progressionSummary = null,
  isGeneratingProgression = false,
}: DualViewProps) {
  return (
    <div className="space-y-6">
      <Separator className="my-8" />

      {/* Progression Summary - Show when rounds completed */}
      {(progressionSummary || isGeneratingProgression) && (
        <ProgressionSummary
          progressionSummary={progressionSummary || ""}
          isStreaming={isGeneratingProgression}
        />
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Unified Consensus */}
        <Card>
          <CardHeader>
            <CardTitle>Unified Consensus</CardTitle>
            <CardDescription>
              Synthesized response incorporating all model insights
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="markdown-content">
              {isStreaming && !consensusContent && (
                <p className="text-muted-foreground animate-pulse">Generating consensus...</p>
              )}
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
                {consensusContent}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>

        {/* Individual Final Responses */}
        <Card>
          <CardHeader>
            <CardTitle>Individual Responses</CardTitle>
            <CardDescription>
              Final responses from each model
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                  <div className="markdown-content max-h-[600px] overflow-y-auto">
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
                      {finalResponses.get(model.id) || "No response"}
                    </ReactMarkdown>
                  </div>
                </TabsContent>
              ))}
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
