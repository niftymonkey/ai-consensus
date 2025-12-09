"use client";

import { useState, useEffect } from "react";
import { ChatHeader } from "@/components/chat/chat-header";
import { ChatInput } from "@/components/chat/chat-input";
import { ModelGrid } from "@/components/chat/model-grid";
import { NoKeysAlert } from "@/components/chat/no-keys-alert";
import { Skeleton } from "@/components/ui/skeleton";

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

  const hasAnyKeys = availableKeys && (availableKeys.anthropic || availableKeys.openai || availableKeys.google);
  const keyCount = availableKeys ? [availableKeys.anthropic, availableKeys.openai, availableKeys.google].filter(Boolean).length : 0;

  if (availableKeys === null) {
    return (
      <div className="container py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
    );
  }

  if (!hasAnyKeys) {
    return (
      <div className="container py-12">
        <div className="space-y-6">
          <ChatHeader keyCount={keyCount} />
          <NoKeysAlert />
        </div>
      </div>
    );
  }

  return (
    <div className="container py-12">
      <div className="space-y-10">
        <ChatHeader keyCount={keyCount} />
        <div className="mx-auto w-full max-w-[80%]">
          <ChatInput
            prompt={prompt}
            setPrompt={setPrompt}
            isLoading={isLoading}
            onSubmit={handleSubmit}
          />
        </div>
        <ModelGrid
          availableKeys={availableKeys}
          selectedModels={selectedModels}
          setSelectedModels={setSelectedModels}
          responses={responses}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
}
