import { useState, useEffect, useCallback } from "react";

export interface TrialStatus {
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

interface UseTrialStatusReturn {
  status: TrialStatus | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const DISABLED_STATUS: TrialStatus = {
  enabled: false,
  runsUsed: 0,
  runsRemaining: 0,
  totalAllowed: 0,
};

/**
 * Hook to fetch trial status from API
 */
export function useTrialStatus(): UseTrialStatusReturn {
  const [status, setStatus] = useState<TrialStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch("/api/trial");

      if (!response.ok) {
        throw new Error(`Failed to fetch trial status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data);
    } catch (err: unknown) {
      console.error("Error fetching trial status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch trial status");
      setStatus(DISABLED_STATUS);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
  };
}
