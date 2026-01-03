import { useState, useEffect } from "react";
import type { ProviderModels } from "@/lib/models";

interface UseAvailableModelsReturn {
  models: ProviderModels | null;
  hasKeys: { anthropic: boolean; openai: boolean; google: boolean; tavily: boolean; openrouter: boolean } | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch available models based on user's API keys
 *
 * Calls /api/models/available which checks provider APIs to determine
 * which models are actually accessible for the user's API keys.
 *
 * Results are cached for 5 minutes on the server side.
 */
export function useAvailableModels(): UseAvailableModelsReturn {
  const [models, setModels] = useState<ProviderModels | null>(null);
  const [hasKeys, setHasKeys] = useState<{
    anthropic: boolean;
    openai: boolean;
    google: boolean;
    tavily: boolean;
    openrouter: boolean;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchModels = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Add cache-busting parameter to ensure fresh data
      const response = await fetch(`/api/models/available?t=${Date.now()}`, {
        cache: 'no-store',
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.status}`);
      }

      const data = await response.json();
      setModels(data.models);
      setHasKeys(data.hasKeys);

      // Log any provider errors but don't block UI
      if (data.errors && Object.keys(data.errors).length > 0) {
        console.warn("Provider availability check errors:", data.errors);
      }
    } catch (err: any) {
      console.error("Error fetching available models:", err);
      setError(err.message || "Failed to fetch models");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchModels();
  }, []);

  return {
    models,
    hasKeys,
    isLoading,
    error,
    refetch: fetchModels,
  };
}
