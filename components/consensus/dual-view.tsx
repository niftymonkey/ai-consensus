"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  isSynthesizing?: boolean;
}

export function DualView({
  consensusContent,
  finalResponses,
  selectedModels,
  isStreaming,
  progressionSummary = null,
  isGeneratingProgression = false,
  isSynthesizing = false,
}: DualViewProps) {
  // Show consensus section if synthesis has started (even if it completed)
  const showConsensus = isSynthesizing || consensusContent;

  // Show evolution section if progression has started (even if it completed)
  const showEvolution = isGeneratingProgression || progressionSummary;

  return (
    <div className="space-y-6">
      <Separator className="my-8" />

      {/* Unified Consensus - Show once synthesis starts, keep visible */}
      {showConsensus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span>✨</span>
              <span>Unified Consensus</span>
            </CardTitle>
            <CardDescription>
              Synthesized response incorporating all model insights
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[600px] overflow-y-auto">
            <div className="markdown-content">
              {!consensusContent ? (
                <p className="text-muted-foreground animate-pulse">Generating consensus...</p>
              ) : (
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
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolution of Consensus - Show once progression starts, keep visible */}
      {showEvolution && (
        <ProgressionSummary
          progressionSummary={progressionSummary || ""}
          isStreaming={isGeneratingProgression}
        />
      )}
    </div>
  );
}
