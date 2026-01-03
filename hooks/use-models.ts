import { useMemo, useState, useEffect } from "react";
import { useAvailableModels } from "./use-available-models";
import { useOpenRouterModels } from "./use-openrouter-models";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";

interface HasKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
  tavily: boolean;
  openrouter: boolean;
}

interface UseModelsReturn {
  /** All available models (filtered based on user's keys) */
  models: OpenRouterModelWithMeta[];
  /** Models grouped by provider */
  groupedModels: Record<string, OpenRouterModelWithMeta[]>;
  /** Which API keys the user has configured */
  hasKeys: HasKeys | null;
  /** Whether user has any usable key (OpenRouter or at least one direct key) */
  hasAnyKey: boolean;
  /** Whether data is still loading */
  isLoading: boolean;
  /** Any error that occurred */
  error: string | null;
  /** Refetch both catalogs */
  refetch: () => Promise<void>;
}

// Providers that support direct API keys
const DIRECT_KEY_PROVIDERS = ["anthropic", "openai", "google"];

/**
 * Unified hook for fetching available models.
 *
 * Two modes:
 * - OpenRouter key: use OpenRouter catalog with OpenRouter IDs (e.g., "anthropic/claude-3-5-haiku")
 * - Direct keys only: use direct provider models with native IDs (e.g., "claude-3-5-haiku-20241022")
 */
export function useModels(): UseModelsReturn {
  // OpenRouter catalog
  const {
    models: orCatalog,
    isLoading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useOpenRouterModels();

  // Check which keys user has configured (also has direct provider models)
  const {
    models: directModels,
    hasKeys,
    isLoading: keysLoading,
    error: keysError,
    refetch: refetchKeys,
  } = useAvailableModels();

  // Read hideFreeModels preference from localStorage
  const [hideFreeModels, setHideFreeModels] = useState(false);
  useEffect(() => {
    const saved = localStorage.getItem("hideFreeModels");
    if (saved !== null) {
      setHideFreeModels(saved === "true");
    }
  }, []);

  const hasOpenRouter = hasKeys?.openrouter ?? false;
  const hasAnyDirectKey =
    hasKeys?.anthropic || hasKeys?.openai || hasKeys?.google;
  const hasAnyKey = hasOpenRouter || hasAnyDirectKey || false;

  // Convert direct provider models to OpenRouter format for UI compatibility
  const convertDirectModelsToORFormat = useMemo(() => {
    if (!directModels || !hasKeys) return [];

    const converted: OpenRouterModelWithMeta[] = [];

    // Convert Anthropic models
    if (hasKeys.anthropic && directModels.anthropic) {
      for (const model of directModels.anthropic) {
        converted.push({
          id: model.id, // Use native ID for direct providers
          name: model.name,
          description: model.description || model.name,
          context_length: model.contextWindow || 0,
          pricing: {
            prompt: ((model.pricing?.input || 0) / 1_000_000).toFixed(6),
            completion: ((model.pricing?.output || 0) / 1_000_000).toFixed(6),
          },
          architecture: {
            modality: model.modality || 'text',
            input_modalities: model.modality?.includes('image') ? ['text', 'image'] : ['text'],
            output_modalities: ['text'],
          },
          top_provider: {
            context_length: model.contextWindow || 0,
            max_completion_tokens: null,
            is_moderated: false,
          },
          supported_parameters: [],
          provider: 'anthropic',
          shortName: model.name,
          costPerMillionInput: model.pricing?.input || 0,
          costPerMillionOutput: model.pricing?.output || 0,
          isFree: (model.pricing?.input || 0) === 0 && (model.pricing?.output || 0) === 0,
          supportsTools: true,
          isTextOnly: !model.modality?.includes('image'),
        });
      }
    }

    // Convert OpenAI models
    if (hasKeys.openai && directModels.openai) {
      for (const model of directModels.openai) {
        converted.push({
          id: model.id, // Use native ID
          name: model.name,
          description: model.description || model.name,
          context_length: model.contextWindow || 0,
          pricing: {
            prompt: ((model.pricing?.input || 0) / 1_000_000).toFixed(6),
            completion: ((model.pricing?.output || 0) / 1_000_000).toFixed(6),
          },
          architecture: {
            modality: model.modality || 'text',
            input_modalities: model.modality?.includes('image') ? ['text', 'image'] : ['text'],
            output_modalities: ['text'],
          },
          top_provider: {
            context_length: model.contextWindow || 0,
            max_completion_tokens: null,
            is_moderated: false,
          },
          supported_parameters: [],
          provider: 'openai',
          shortName: model.name,
          costPerMillionInput: model.pricing?.input || 0,
          costPerMillionOutput: model.pricing?.output || 0,
          isFree: (model.pricing?.input || 0) === 0 && (model.pricing?.output || 0) === 0,
          supportsTools: true,
          isTextOnly: !model.modality?.includes('image'),
        });
      }
    }

    // Convert Google models
    if (hasKeys.google && directModels.google) {
      for (const model of directModels.google) {
        converted.push({
          id: model.id, // Use native ID
          name: model.name,
          description: model.description || model.name,
          context_length: model.contextWindow || 0,
          pricing: {
            prompt: ((model.pricing?.input || 0) / 1_000_000).toFixed(6),
            completion: ((model.pricing?.output || 0) / 1_000_000).toFixed(6),
          },
          architecture: {
            modality: model.modality || 'text',
            input_modalities: model.modality?.includes('image') ? ['text', 'image'] : ['text'],
            output_modalities: ['text'],
          },
          top_provider: {
            context_length: model.contextWindow || 0,
            max_completion_tokens: null,
            is_moderated: false,
          },
          supported_parameters: [],
          provider: 'google',
          shortName: model.name,
          costPerMillionInput: model.pricing?.input || 0,
          costPerMillionOutput: model.pricing?.output || 0,
          isFree: (model.pricing?.input || 0) === 0 && (model.pricing?.output || 0) === 0,
          supportsTools: true,
          isTextOnly: !model.modality?.includes('image'),
        });
      }
    }

    return converted;
  }, [directModels, hasKeys]);

  // Choose which model source to use based on available keys
  // Priority: Direct keys always win over OpenRouter for the same provider
  const models = useMemo(() => {
    let result: OpenRouterModelWithMeta[] = [];

    if (hasAnyDirectKey) {
      // Always include direct provider models when available
      result = [...convertDirectModelsToORFormat];
    }

    if (hasOpenRouter) {
      // Add OpenRouter models, but exclude providers we already have direct keys for
      let orModels = orCatalog;

      // Filter out free models if setting is enabled
      if (hideFreeModels) {
        orModels = orModels.filter((model) => !model.id.endsWith(":free"));
      }

      // Filter out providers we have direct keys for (direct keys win)
      orModels = orModels.filter((model) => {
        if (model.provider === 'anthropic' && hasKeys?.anthropic) return false;
        if (model.provider === 'openai' && hasKeys?.openai) return false;
        if (model.provider === 'google' && hasKeys?.google) return false;
        return true; // Include all other providers from OpenRouter
      });

      result = [...result, ...orModels];
    }

    return result;
  }, [orCatalog, convertDirectModelsToORFormat, hasOpenRouter, hasAnyDirectKey, hasKeys, hideFreeModels]);

  // Group filtered models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, OpenRouterModelWithMeta[]> = {};

    for (const model of models) {
      if (!groups[model.provider]) {
        groups[model.provider] = [];
      }
      groups[model.provider].push(model);
    }

    // Sort models within each group
    for (const provider of Object.keys(groups)) {
      groups[provider].sort((a, b) => a.shortName.localeCompare(b.shortName));
    }

    return groups;
  }, [models]);

  // Combined refetch
  const refetch = async () => {
    await Promise.all([refetchCatalog(), refetchKeys()]);
  };

  return {
    models,
    groupedModels,
    hasKeys,
    hasAnyKey,
    isLoading: catalogLoading || keysLoading,
    error: catalogError || keysError,
    refetch,
  };
}
