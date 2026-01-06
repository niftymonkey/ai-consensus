import { useMemo, useState, useEffect, useCallback } from "react";
import { useOpenRouterModels } from "./use-openrouter-models";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";
import { canAccessModel, type KeySet } from "@/lib/model-routing";

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

/**
 * Unified hook for fetching available models.
 *
 * Uses OpenRouter catalog for all model metadata.
 * Filters based on user's configured API keys.
 */
export function useModels(): UseModelsReturn {
  // OpenRouter catalog (public, always available)
  const {
    models: orCatalog,
    isLoading: catalogLoading,
    error: catalogError,
    refetch: refetchCatalog,
  } = useOpenRouterModels();

  // Which keys user has configured
  const [hasKeys, setHasKeys] = useState<HasKeys | null>(null);
  const [keysLoading, setKeysLoading] = useState(true);
  const [keysError, setKeysError] = useState<string | null>(null);

  // Read hideFreeModels preference from localStorage
  const [hideFreeModels, setHideFreeModels] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("hideFreeModels");
    if (saved !== null) {
      setHideFreeModels(saved === "true");
    }
  }, []);

  // Fetch which keys user has
  const fetchKeys = useCallback(async () => {
    try {
      setKeysLoading(true);
      setKeysError(null);

      const response = await fetch("/api/keys");
      if (!response.ok) {
        throw new Error(`Failed to fetch keys: ${response.status}`);
      }

      const data = await response.json();
      const keys = data.keys || {};

      setHasKeys({
        anthropic: !!keys.anthropic,
        openai: !!keys.openai,
        google: !!keys.google,
        tavily: !!keys.tavily,
        openrouter: !!keys.openrouter,
      });
    } catch (err: unknown) {
      console.error("Error fetching keys:", err);
      setKeysError(err instanceof Error ? err.message : "Failed to fetch keys");
    } finally {
      setKeysLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKeys();

    // Listen for key updates from settings page
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "apiKeysUpdated") {
        fetchKeys();
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [fetchKeys]);

  const hasOpenRouter = hasKeys?.openrouter ?? false;
  const hasAnyDirectKey = hasKeys?.anthropic || hasKeys?.openai || hasKeys?.google;
  const hasAnyKey = hasOpenRouter || hasAnyDirectKey || false;

  // Build KeySet for filtering
  const keySet: KeySet = useMemo(() => ({
    anthropic: hasKeys?.anthropic ? "configured" : null,
    openai: hasKeys?.openai ? "configured" : null,
    google: hasKeys?.google ? "configured" : null,
    openrouter: hasKeys?.openrouter ? "configured" : null,
  }), [hasKeys]);

  // Filter models based on available keys
  const models = useMemo(() => {
    let result = orCatalog;

    // Filter out free models if setting is enabled
    if (hideFreeModels) {
      result = result.filter((model) => !model.id.endsWith(":free"));
    }

    // Filter to only models accessible with user's keys
    result = result.filter((model) => canAccessModel(model.id, keySet));

    return result;
  }, [orCatalog, keySet, hideFreeModels]);

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
    await Promise.all([refetchCatalog(), fetchKeys()]);
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
