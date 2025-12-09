"use client";

import { useState } from "react";
import Link from "next/link";

interface ModelResponse {
  content: string;
  isStreaming: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
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
        body: JSON.stringify({ prompt }),
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
    title,
    color,
    response,
  }: {
    title: string;
    color: string;
    response: ModelResponse;
  }) {
    return (
      <div className="flex-1 border border-gray-200 rounded-lg">
        <div className={`px-4 py-3 border-b border-gray-200 ${color}`}>
          <h3 className="font-semibold text-white">{title}</h3>
        </div>
        <div className="p-4 min-h-[400px] max-h-[600px] overflow-y-auto">
          {response.hasError ? (
            <div className="text-red-600 text-sm">
              <p className="font-semibold mb-2">Error:</p>
              <p>{response.errorMessage || "An error occurred"}</p>
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
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{response.content}</p>
              {response.isStreaming && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1"></span>
              )}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">
              Response will appear here...
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-claude via-gpt to-gemini-end bg-clip-text text-transparent">
              AI Consensus
            </span>
          </h1>
          <p className="text-gray-600">
            Ask a question and see responses from Claude, GPT-4, and Gemini
          </p>
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

        <div className="grid md:grid-cols-3 gap-6">
          <ModelColumn
            title="Claude"
            color="bg-claude"
            response={responses.claude}
          />
          <ModelColumn
            title="GPT-4"
            color="bg-gpt"
            response={responses.gpt}
          />
          <ModelColumn
            title="Gemini"
            color="bg-gemini-start"
            response={responses.gemini}
          />
        </div>
      </div>
    </div>
  );
}
