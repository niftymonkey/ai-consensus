import { useMemo, useState, useEffect, useCallback } from "react";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";

interface HasKeys {
  anthropic: boolean;
  openai: boolean;
  google: boolean;
  tavily: boolean;
  openrouter: boolean;
}

interface UseModelsReturn {
  /** All available models (filtered based on user's keys and provider availability) */
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
  /** Refetch models */
  refetch: () => Promise<void>;
}

/**
 * Unified hook for fetching available models.
 *
 * Calls /api/models/available which:
 * 1. Gets OpenRouter catalog for model metadata
 * 2. Filters based on which API keys the user has configured
 * 3. For direct keys, calls provider APIs to check which models are actually available
 *
 * This ensures users only see models they can actually use.
 */
export function useModels(): UseModelsReturn {
  const [models, setModels] = useState<OpenRouterModelWithMeta[]>([]);
  const [hasKeys, setHasKeys] = useState<HasKeys | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Read hideFreeModels preference from localStorage
  const [hideFreeModels, setHideFreeModels] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hideFreeModels");
    if (saved !== null) {
      setHideFreeModels(saved === "true");
    }
  }, []);

  // Fetch available models from server (includes two-phase filtering)
  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/models/available");
      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();

      setModels(data.models || []);
      setHasKeys(data.hasKeys || null);

      // Log any provider errors for debugging (but don't fail)
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.warn("Provider availability check errors:", data.errors);
      }
    } catch (err: unknown) {
      console.error("Error fetching available models:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch models");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();

    // Listen for key updates from settings page (cross-tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "apiKeysUpdated") {
        fetchModels();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchModels]);

  const hasOpenRouter = hasKeys?.openrouter ?? false;
  const hasAnyDirectKey = hasKeys?.anthropic || hasKeys?.openai || hasKeys?.google;
  const hasAnyKey = hasOpenRouter || hasAnyDirectKey || false;

  // Apply client-side filtering for hideFreeModels preference
  const filteredModels = useMemo(() => {
    if (!hideFreeModels) {
      return models;
    }
    return models.filter((model) => !model.id.endsWith(":free"));
  }, [models, hideFreeModels]);

  // Group filtered models by provider
  const groupedModels = useMemo(() => {
    const groups: Record<string, OpenRouterModelWithMeta[]> = {};

    for (const model of filteredModels) {
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
  }, [filteredModels]);

  return {
    models: filteredModels,
    groupedModels,
    hasKeys,
    hasAnyKey,
    isLoading,
    error,
    refetch: fetchModels,
  };
}
