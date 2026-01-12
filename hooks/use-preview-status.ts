import { useState, useEffect, useCallback } from "react";

export interface PreviewStatus {
  enabled: boolean;
  runsUsed: number;
  runsRemaining: number;
  totalAllowed: number;
  constraints?: {
    maxRounds: number;
    maxParticipants: number;
    allowedModels: readonly string[];
  };
}

interface UsePreviewStatusReturn {
  status: PreviewStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  decrementRun: () => void;
}

const DISABLED_STATUS: PreviewStatus = {
  enabled: false,
  runsUsed: 0,
  runsRemaining: 0,
  totalAllowed: 0,
};

/**
 * Hook to fetch preview status from API
 */
export function usePreviewStatus(): UsePreviewStatusReturn {
  const [status, setStatus] = useState<PreviewStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/preview");

      if (!response.ok) {
        throw new Error(`Failed to fetch preview status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
    } catch (err: unknown) {
      console.error("Error fetching preview status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch preview status");
      setStatus(DISABLED_STATUS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Immediately decrement local run count (for instant UI update)
  const decrementRun = useCallback(() => {
    setStatus((prev) => {
      if (!prev || prev.runsRemaining <= 0) return prev;
      return {
        ...prev,
        runsUsed: prev.runsUsed + 1,
        runsRemaining: prev.runsRemaining - 1,
      };
    });
  }, []);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    decrementRun,
  };
}
