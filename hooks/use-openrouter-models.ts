import { useState, useEffect, useCallback } from "react";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";

interface UseOpenRouterModelsReturn {
  models: OpenRouterModelWithMeta[];
  groupedModels: Record<string, OpenRouterModelWithMeta[]>;
  providers: string[];
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch OpenRouter models from our API
 */
export function useOpenRouterModels(): UseOpenRouterModelsReturn {
  const [models, setModels] = useState<OpenRouterModelWithMeta[]>([]);
  const [groupedModels, setGroupedModels] = useState<
    Record<string, OpenRouterModelWithMeta[]>
  >({});
  const [providers, setProviders] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/openrouter-models");

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      setModels(data.models || []);
      setGroupedModels(data.grouped || {});
      setProviders(data.providers || []);
    } catch (err: any) {
      console.error("Error fetching OpenRouter models:", err);
      setError(err.message || "Failed to fetch models");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  return {
    models,
    groupedModels,
    providers,
    isLoading,
    error,
    refetch: fetchModels,
  };
}
