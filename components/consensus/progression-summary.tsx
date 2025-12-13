"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ProgressionSummaryProps {
  progressionSummary: string;
  isStreaming?: boolean;
}

export function ProgressionSummary({ progressionSummary, isStreaming = false }: ProgressionSummaryProps) {
  if (!progressionSummary && !isStreaming) return null;

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          <span>Evolution of Consensus</span>
        </CardTitle>
        <CardDescription>
          How the models refined their perspectives across rounds
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isStreaming && !progressionSummary && (
          <p className="text-muted-foreground animate-pulse">Analyzing how consensus evolved...</p>
        )}
        {progressionSummary && (
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ node, ...props }) => (
                  <p className="mb-4 leading-relaxed text-base" {...props} />
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
                  <strong className="font-bold text-primary" {...props} />
                ),
                em: ({ node, ...props }) => (
                  <em className="italic text-muted-foreground" {...props} />
                ),
              }}
            >
              {progressionSummary}
            </ReactMarkdown>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
