import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle } from "lucide-react";

interface ModelResponse {
  content: string;
  isStreaming: boolean;
  hasError: boolean;
  errorMessage?: string;
}

interface ModelColumnProps {
  modelKey: "claude" | "gpt" | "gemini";
  models: readonly { id: string; name: string }[];
  colorClass: string;
  foregroundClass: string;
  response: ModelResponse;
  selectedModel: string;
  onModelChange: (value: string) => void;
  isLoading: boolean;
}

export function ModelColumn({
  modelKey,
  models,
  colorClass,
  foregroundClass,
  response,
  selectedModel,
  onModelChange,
  isLoading,
}: ModelColumnProps) {
  return (
    <Card>
      <CardHeader className={`${colorClass} ${foregroundClass}`}>
        <Select
          value={selectedModel}
          onValueChange={onModelChange}
          disabled={isLoading}
        >
          <SelectTrigger className="border-white/20 bg-transparent [&>span]:text-current">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {models.map((model) => (
              <SelectItem key={model.id} value={model.id}>
                {model.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent className="max-h-[800px] min-h-[500px] overflow-y-auto p-6">
        {response.hasError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {response.errorMessage || "An error occurred"}
              {response.errorMessage === "API key not configured" && (
                <Button variant="outline" size="sm" className="mt-4" asChild>
                  <Link href="/settings">Configure API Keys</Link>
                </Button>
              )}
            </AlertDescription>
          </Alert>
        ) : response.content || response.isStreaming ? (
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
              {response.content}
            </ReactMarkdown>
            {response.isStreaming && (
              <span className="ml-1 inline-block h-5 w-2 animate-pulse bg-foreground align-middle"></span>
            )}
          </div>
        ) : (
          <p className="italic text-muted-foreground">
            Response will appear here...
          </p>
        )}
      </CardContent>
    </Card>
  );
}
