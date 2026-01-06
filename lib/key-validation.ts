/**
 * API Key Validation
 *
 * Validates API keys by making test requests to provider endpoints.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

type Provider = "openrouter" | "anthropic" | "openai" | "google";

/**
 * Provider endpoint configurations
 */
const PROVIDER_ENDPOINTS: Record<Provider, { url: string; getHeaders: (key: string) => Record<string, string> }> = {
  openrouter: {
    // Use /credits endpoint which requires valid auth (returns 401 for invalid keys)
    // See: https://openrouter.ai/docs/api/api-reference/credits/get-credits
    url: "https://openrouter.ai/api/v1/credits",
    getHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
    }),
  },
  anthropic: {
    url: "https://api.anthropic.com/v1/models",
    getHeaders: (key) => ({
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    }),
  },
  openai: {
    url: "https://api.openai.com/v1/models",
    getHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
    }),
  },
  google: {
    // Google puts key in URL, not header
    url: "https://generativelanguage.googleapis.com/v1beta/models",
    getHeaders: () => ({}),
  },
};

/**
 * Validate an API key by making a test request to the provider.
 *
 * @param provider - The provider name
 * @param key - The API key to validate
 * @returns Validation result with success/failure and error message
 */
export async function validateApiKey(provider: string, key: string): Promise<ValidationResult> {
  // Validate key is not empty
  if (!key || key.trim() === "") {
    return { valid: false, error: "API key is required" };
  }

  // Check if provider is supported
  if (!isValidProvider(provider)) {
    return { valid: false, error: "Unknown provider" };
  }

  const config = PROVIDER_ENDPOINTS[provider];

  try {
    // Build URL (Google uses key in URL)
    const url = provider === "google" ? `${config.url}?key=${key}` : config.url;

    const response = await fetch(url, {
      method: "GET",
      headers: config.getHeaders(key),
    });

    if (response.ok) {
      return { valid: true };
    }

    // Handle error responses
    if (response.status === 401 || response.status === 403 || response.status === 400) {
      return { valid: false, error: "Invalid API key" };
    }

    // Other errors
    return { valid: false, error: `Validation failed (${response.status})` };
  } catch {
    return { valid: false, error: "Network error - please try again" };
  }
}

function isValidProvider(provider: string): provider is Provider {
  return provider in PROVIDER_ENDPOINTS;
}
