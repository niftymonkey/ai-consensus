import { ModelColumn } from "./model-column";
import { PlaceholderColumn } from "./placeholder-column";
import type { ProviderModels } from "@/lib/models";

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
  openrouter: boolean;
}

interface ModelGridProps {
  availableKeys: AvailableKeys;
  availableModels: ProviderModels | null;
  selectedModels: {
    claude: string;
    gpt: string;
    gemini: string;
  };
  setSelectedModels: (models: { claude: string; gpt: string; gemini: string }) => void;
  responses: {
    claude: ModelResponse;
    gpt: ModelResponse;
    gemini: ModelResponse;
  };
  isLoading: boolean;
}

export function ModelGrid({
  availableKeys,
  availableModels,
  selectedModels,
  setSelectedModels,
  responses,
  isLoading,
}: ModelGridProps) {
  // If models not loaded yet, show loading placeholders
  if (!availableModels) {
    return (
      <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        <PlaceholderColumn title="Claude" colorClass="bg-primary" foregroundClass="text-primary-foreground" />
        <PlaceholderColumn title="GPT" colorClass="bg-secondary" foregroundClass="text-secondary-foreground" />
        <PlaceholderColumn title="Gemini" colorClass="bg-accent" foregroundClass="text-accent-foreground" />
      </div>
    );
  }

  return (
    <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
      {availableKeys.anthropic ? (
        <ModelColumn
          modelKey="claude"
          models={availableModels.anthropic}
          colorClass="bg-primary"
          foregroundClass="text-primary-foreground"
          response={responses.claude}
          selectedModel={selectedModels.claude}
          onModelChange={(value) =>
            setSelectedModels({ ...selectedModels, claude: value })
          }
          isLoading={isLoading}
        />
      ) : (
        <PlaceholderColumn title="Claude" colorClass="bg-primary" foregroundClass="text-primary-foreground" />
      )}
      {availableKeys.openai ? (
        <ModelColumn
          modelKey="gpt"
          models={availableModels.openai}
          colorClass="bg-secondary"
          foregroundClass="text-secondary-foreground"
          response={responses.gpt}
          selectedModel={selectedModels.gpt}
          onModelChange={(value) =>
            setSelectedModels({ ...selectedModels, gpt: value })
          }
          isLoading={isLoading}
        />
      ) : (
        <PlaceholderColumn title="GPT" colorClass="bg-secondary" foregroundClass="text-secondary-foreground" />
      )}
      {availableKeys.google ? (
        <ModelColumn
          modelKey="gemini"
          models={availableModels.google}
          colorClass="bg-accent"
          foregroundClass="text-accent-foreground"
          response={responses.gemini}
          selectedModel={selectedModels.gemini}
          onModelChange={(value) =>
            setSelectedModels({ ...selectedModels, gemini: value })
          }
          isLoading={isLoading}
        />
      ) : (
        <PlaceholderColumn title="Gemini" colorClass="bg-accent" foregroundClass="text-accent-foreground" />
      )}
    </div>
  );
}
