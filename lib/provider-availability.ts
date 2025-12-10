/**
 * Provider model availability checking
 *
 * Checks which models are available for a given API key by calling provider APIs.
 * Results are cached for 5 minutes to prevent excessive API calls.
 */

interface ProviderCheckResult {
  available: string[];
  error?: string;
}

interface CacheEntry {
  data: ProviderCheckResult;
  timestamp: number;
}

// In-memory cache with 5 minute TTL
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const cache = new Map<string, CacheEntry>();

/**
 * Check OpenAI model availability
 * Calls: GET https://api.openai.com/v1/models
 */
async function checkOpenAIModels(apiKey: string): Promise<ProviderCheckResult> {
  try {
    const response = await fetch("https://api.openai.com/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`OpenAI API error: ${response.status}`);
      return { available: [], error: `API returned ${response.status}` };
    }

    const data = await response.json();
    return {
      available: data.data.map((m: any) => m.id),
    };
  } catch (error: any) {
    console.error("Error checking OpenAI models:", error);
    return { available: [], error: error.message };
  }
}

/**
 * Check Anthropic model availability
 * Calls: GET https://api.anthropic.com/v1/models
 */
async function checkAnthropicModels(apiKey: string): Promise<ProviderCheckResult> {
  try {
    const response = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      console.error(`Anthropic API error: ${response.status}`);
      return { available: [], error: `API returned ${response.status}` };
    }

    const data = await response.json();
    return {
      available: data.data.map((m: any) => m.id),
    };
  } catch (error: any) {
    console.error("Error checking Anthropic models:", error);
    return { available: [], error: error.message };
  }
}

/**
 * Check Google model availability
 * Calls: GET https://generativelanguage.googleapis.com/v1beta/models
 */
async function checkGoogleModels(apiKey: string): Promise<ProviderCheckResult> {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      console.error(`Google API error: ${response.status}`);
      return { available: [], error: `API returned ${response.status}` };
    }

    const data = await response.json();
    return {
      available: data.models
        .map((m: any) => m.name.replace("models/", ""))
        .filter((id: string) => id.startsWith("gemini")),
    };
  } catch (error: any) {
    console.error("Error checking Google models:", error);
    return { available: [], error: error.message };
  }
}

/**
 * Get cached result or fetch fresh data
 */
function getCachedOrFetch(
  cacheKey: string,
  fetchFn: () => Promise<ProviderCheckResult>
): Promise<ProviderCheckResult> {
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.timestamp < CACHE_TTL) {
    return Promise.resolve(cached.data);
  }

  return fetchFn().then((result) => {
    cache.set(cacheKey, { data: result, timestamp: now });
    return result;
  });
}

/**
 * Main export: Check model availability for all providers
 *
 * @param keys - API keys for each provider
 * @returns Available model IDs per provider and any errors
 */
export async function checkProviderAvailability(keys: {
  anthropic?: string | null;
  openai?: string | null;
  google?: string | null;
}): Promise<{
  anthropic: string[];
  openai: string[];
  google: string[];
  errors: Record<string, string>;
}> {
  const results = await Promise.allSettled([
    keys.anthropic
      ? getCachedOrFetch(`anthropic:${keys.anthropic.slice(-8)}`, () =>
          checkAnthropicModels(keys.anthropic!)
        )
      : Promise.resolve({ available: [] } as ProviderCheckResult),
    keys.openai
      ? getCachedOrFetch(`openai:${keys.openai.slice(-8)}`, () =>
          checkOpenAIModels(keys.openai!)
        )
      : Promise.resolve({ available: [] } as ProviderCheckResult),
    keys.google
      ? getCachedOrFetch(`google:${keys.google.slice(-8)}`, () =>
          checkGoogleModels(keys.google!)
        )
      : Promise.resolve({ available: [] } as ProviderCheckResult),
  ]);

  const errors: Record<string, string> = {};

  return {
    anthropic: results[0].status === "fulfilled" ? results[0].value.available : [],
    openai: results[1].status === "fulfilled" ? results[1].value.available : [],
    google: results[2].status === "fulfilled" ? results[2].value.available : [],
    errors: {
      ...(results[0].status === "fulfilled" && results[0].value.error
        ? { anthropic: results[0].value.error }
        : {}),
      ...(results[1].status === "fulfilled" && results[1].value.error
        ? { openai: results[1].value.error }
        : {}),
      ...(results[2].status === "fulfilled" && results[2].value.error
        ? { google: results[2].value.error }
        : {}),
    },
  };
}
