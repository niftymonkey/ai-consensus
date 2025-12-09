"use client";

import { useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ANTHROPIC_MODELS, OPENAI_MODELS, GOOGLE_MODELS } from "@/lib/models";

interface ModelResponse {
  content: string;
  isStreaming: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModels, setSelectedModels] = useState({
    claude: "claude-3-5-haiku-20241022",
    gpt: "gpt-5-chat-latest",
    gemini: "gemini-2.5-flash-lite",
  });
  const [responses, setResponses] = useState<{
    claude: ModelResponse;
    gpt: ModelResponse;
    gemini: ModelResponse;
  }>({
    claude: { content: "", isStreaming: false, hasError: false },
    gpt: { content: "", isStreaming: false, hasError: false },
    gemini: { content: "", isStreaming: false, hasError: false },
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!prompt.trim()) return;

    setIsLoading(true);
    setResponses({
      claude: { content: "", isStreaming: true, hasError: false },
      gpt: { content: "", isStreaming: true, hasError: false },
      gemini: { content: "", isStreaming: true, hasError: false },
    });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          models: selectedModels,
        }),
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

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim());

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            const modelKey = data.model as "claude" | "gpt" | "gemini";

            setResponses((prev) => {
              const updated = { ...prev };

              if (data.type === "start") {
                updated[modelKey] = {
                  content: "",
                  isStreaming: true,
                  hasError: false,
                };
              } else if (data.type === "chunk") {
                updated[modelKey] = {
                  ...updated[modelKey],
                  content: updated[modelKey].content + data.content,
                };
              } else if (data.type === "complete") {
                updated[modelKey] = {
                  ...updated[modelKey],
                  isStreaming: false,
                };
              } else if (data.type === "error") {
                updated[modelKey] = {
                  content: "",
                  isStreaming: false,
                  hasError: true,
                  errorMessage: data.content,
                };
              }

              return updated;
            });
          } catch (e) {
            console.error("Failed to parse chunk:", e);
          }
        }
      }
    } catch (error: any) {
      console.error("Error:", error);
      setResponses({
        claude: { content: "", isStreaming: false, hasError: true, errorMessage: error.message },
        gpt: { content: "", isStreaming: false, hasError: true, errorMessage: error.message },
        gemini: { content: "", isStreaming: false, hasError: true, errorMessage: error.message },
      });
    } finally {
      setIsLoading(false);
    }
  }

  function ModelColumn({
    modelKey,
    models,
    color,
    response,
  }: {
    modelKey: "claude" | "gpt" | "gemini";
    models: readonly { id: string; name: string }[];
    color: string;
    response: ModelResponse;
  }) {
    return (
      <div className="flex-1 border border-gray-200 rounded-lg">
        <div className={`px-4 py-3 border-b border-gray-200 ${color}`}>
          <select
            value={selectedModels[modelKey]}
            onChange={(e) =>
              setSelectedModels({ ...selectedModels, [modelKey]: e.target.value })
            }
            disabled={isLoading}
            className="w-full bg-white bg-opacity-20 text-white font-semibold rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id} className="text-gray-900">
                {model.name}
              </option>
            ))}
          </select>
        </div>
        <div className="p-6 min-h-[500px] max-h-[800px] overflow-y-auto bg-gray-50">
          {response.hasError ? (
            <div className="text-red-600">
              <p className="font-semibold mb-3 text-base">Error:</p>
              <p className="text-sm leading-relaxed">{response.errorMessage || "An error occurred"}</p>
              {response.errorMessage === "API key not configured" && (
                <Link
                  href="/settings"
                  className="inline-block mt-4 px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700"
                >
                  Configure API Keys
                </Link>
              )}
            </div>
          ) : response.content || response.isStreaming ? (
            <div className="markdown-content">
              <style jsx>{`
                .markdown-content ol + ul {
                  margin-left: 3rem;
                }
              `}</style>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({node, ...props}) => <p className="mb-4 leading-relaxed" {...props} />,
                  ul: ({node, ...props}) => <ul className="mb-4 ml-6 list-disc space-y-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="mb-4 ml-6 list-decimal space-y-2" {...props} />,
                  li: ({node, ...props}) => <li className="leading-relaxed" {...props} />,
                  h1: ({node, ...props}) => <h1 className="text-2xl font-bold mb-4 mt-6" {...props} />,
                  h2: ({node, ...props}) => <h2 className="text-xl font-bold mb-3 mt-5" {...props} />,
                  h3: ({node, ...props}) => <h3 className="text-lg font-bold mb-3 mt-4" {...props} />,
                  strong: ({node, ...props}) => <strong className="font-bold text-gray-900" {...props} />,
                }}
              >
                {response.content}
              </ReactMarkdown>
              {response.isStreaming && (
                <span className="inline-block w-2 h-5 bg-gray-600 animate-pulse ml-1 align-middle"></span>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-base italic">
              Response will appear here...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="w-full mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <p className="text-gray-600">
              Ask a question and see responses from Claude, GPT, and Gemini
            </p>
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
              Your Question
            </label>
            <textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What would you like to ask?"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-claude focus:border-transparent resize-none"
              rows={4}
              disabled={isLoading}
            />
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Responses will stream in real-time from all configured models
              </p>
              <button
                type="submit"
                disabled={isLoading || !prompt.trim()}
                className="px-6 py-2 bg-gradient-to-r from-claude to-gpt text-white rounded-lg font-semibold hover:shadow-lg transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? "Getting responses..." : "Ask"}
              </button>
            </div>
          </div>
        </form>

        <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-8">
          <ModelColumn
            modelKey="claude"
            models={ANTHROPIC_MODELS}
            color="bg-claude"
            response={responses.claude}
          />
          <ModelColumn
            modelKey="gpt"
            models={OPENAI_MODELS}
            color="bg-gpt"
            response={responses.gpt}
          />
          <ModelColumn
            modelKey="gemini"
            models={GOOGLE_MODELS}
            color="bg-gemini-start"
            response={responses.gemini}
          />
        </div>
      </div>
    </div>
  );
}
