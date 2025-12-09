"use client";

import { useState, useEffect } from "react";
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

interface AvailableKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [testMode, setTestMode] = useState<string | null>(null);
  const [availableKeys, setAvailableKeys] = useState<AvailableKeys | null>(null);
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

  /**
   * Dev Tools Testing:
   * Open browser console and use setTestMode() to test different API key configurations.
   * The UI updates instantly without refresh.
   *
   * Usage:
   *   setTestMode("none")         // No keys
   *   setTestMode("claude")       // Only Claude
   *   setTestMode("gpt")          // Only GPT
   *   setTestMode("gemini")       // Only Gemini
   *   setTestMode("claude-gpt")   // Claude + GPT
   *   setTestMode("claude-gemini") // Claude + Gemini
   *   setTestMode("gpt-gemini")   // GPT + Gemini
   *   setTestMode("all")          // All three
   *   setTestMode(null)           // Use real API keys
   */
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).setTestMode = (mode: string | null) => {
        setTestMode(mode);
      };
    }
  }, []);

  useEffect(() => {
    async function fetchAvailableKeys() {
      if (testMode) {
        const testScenarios: Record<string, AvailableKeys> = {
          "none": { anthropic: false, openai: false, google: false },
          "claude": { anthropic: true, openai: false, google: false },
          "gpt": { anthropic: false, openai: true, google: false },
          "gemini": { anthropic: false, openai: false, google: true },
          "claude-gpt": { anthropic: true, openai: true, google: false },
          "claude-gemini": { anthropic: true, openai: false, google: true },
          "gpt-gemini": { anthropic: false, openai: true, google: true },
          "all": { anthropic: true, openai: true, google: true },
        };

        if (testScenarios[testMode]) {
          setAvailableKeys(testScenarios[testMode]);
          return;
        }
      }

      // Real API call
      try {
        const response = await fetch("/api/keys");
        if (response.ok) {
          const data = await response.json();
          setAvailableKeys({
            anthropic: !!data.keys.anthropic,
            openai: !!data.keys.openai,
            google: !!data.keys.google,
          });
        }
      } catch (error) {
        console.error("Failed to fetch API keys:", error);
      }
    }
    fetchAvailableKeys();
  }, [testMode]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }

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

  function PlaceholderColumn({
    title,
    color,
  }: {
    title: string;
    color: string;
  }) {
    return (
      <div className="flex-1 border border-gray-200 rounded-lg opacity-50">
        <div className={`px-4 py-3 border-b border-gray-200 ${color}`}>
          <h3 className="font-semibold text-white text-center">{title}</h3>
        </div>
        <div className="p-6 min-h-[500px] max-h-[800px] overflow-y-auto bg-gray-50 flex flex-col items-center justify-center text-center">
          <div className="mb-4">
            <svg className="w-16 h-16 mx-auto text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <p className="text-gray-500 font-semibold mb-2">API Key Not Configured</p>
          <p className="text-sm text-gray-400 mb-4 max-w-xs">
            Add your {title} API key to enable consensus across multiple models
          </p>
          <Link
            href="/settings"
            className="px-4 py-2 bg-gray-800 text-white rounded-md text-sm hover:bg-gray-700 transition-colors"
          >
            Add {title} Key
          </Link>
        </div>
      </div>
    );
  }

  // Check if we have any API keys configured
  const hasAnyKeys = availableKeys && (availableKeys.anthropic || availableKeys.openai || availableKeys.google);
  const keyCount = availableKeys ? [availableKeys.anthropic, availableKeys.openai, availableKeys.google].filter(Boolean).length : 0;

  // Loading state while fetching keys
  if (availableKeys === null) {
    return (
      <div className="w-full px-6 py-8">
        <div className="w-full max-w-[1800px] mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <p className="text-gray-500">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // No API keys configured
  if (!hasAnyKeys) {
    return (
      <div className="w-full px-6 py-8">
        <div className="w-full max-w-[1800px] mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              <span className="bg-gradient-to-r from-claude via-gpt to-gemini-end bg-clip-text text-transparent">
                AI Consensus
              </span>
            </h1>
            <p className="text-gray-600">
              Ask a question and see responses from Claude, GPT, and Gemini
            </p>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <h2 className="text-xl font-semibold mb-3 text-yellow-900">No API Keys Configured</h2>
            <p className="text-gray-700 mb-6">
              To start using AI Consensus, you need to configure at least one API key.
              Add your API keys for Claude, GPT, or Gemini in the settings page.
            </p>
            <Link
              href="/settings"
              className="inline-block px-6 py-3 bg-gradient-to-r from-claude to-gpt text-white rounded-lg font-semibold hover:shadow-lg transition-shadow"
            >
              Configure API Keys
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full px-6 py-8">
      <div className="w-full max-w-[1800px] mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">
            <span className="bg-gradient-to-r from-claude via-gpt to-gemini-end bg-clip-text text-transparent">
              AI Consensus
            </span>
          </h1>
          <p className="text-gray-600">
            {keyCount < 3 ? (
              <>Get consensus across AI models - configure {3 - keyCount} more {keyCount === 2 ? "key" : "keys"} to unlock full potential</>
            ) : (
              <>Ask a question and see responses from Claude, GPT, and Gemini</>
            )}
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
              onKeyDown={handleKeyDown}
              placeholder="What would you like to ask?"
              className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-claude focus:border-transparent resize-none"
              rows={4}
              disabled={isLoading}
            />
            <div className="mt-4 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Press Enter to send, Shift+Enter for new line
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
          {availableKeys.anthropic ? (
            <ModelColumn
              modelKey="claude"
              models={ANTHROPIC_MODELS}
              color="bg-claude"
              response={responses.claude}
            />
          ) : (
            <PlaceholderColumn title="Claude" color="bg-claude" />
          )}
          {availableKeys.openai ? (
            <ModelColumn
              modelKey="gpt"
              models={OPENAI_MODELS}
              color="bg-gpt"
              response={responses.gpt}
            />
          ) : (
            <PlaceholderColumn title="GPT" color="bg-gpt" />
          )}
          {availableKeys.google ? (
            <ModelColumn
              modelKey="gemini"
              models={GOOGLE_MODELS}
              color="bg-gemini-start"
              response={responses.gemini}
            />
          ) : (
            <PlaceholderColumn title="Gemini" color="bg-gemini-start" />
          )}
        </div>
      </div>
    </div>
  );
}
