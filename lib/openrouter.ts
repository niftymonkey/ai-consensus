import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import type { AIErrorType } from './consensus-events';

/**
 * Create an OpenRouter provider instance
 */
export function createOpenRouterProvider(apiKey: string) {
  return createOpenRouter({
    apiKey,
  });
}

/**
 * Mapping from our internal model IDs to OpenRouter model IDs
 * OpenRouter uses format: provider/model-name
 */
export const MODEL_ID_TO_OPENROUTER: Record<string, string> = {
  // Anthropic models
  "claude-3-5-haiku-20241022": "anthropic/claude-3.5-haiku",
  "claude-3-5-haiku-latest": "anthropic/claude-3.5-haiku",
  "claude-3-7-sonnet-20250219": "anthropic/claude-3.7-sonnet",
  "claude-3-7-sonnet-latest": "anthropic/claude-3.7-sonnet",
  "claude-haiku-4-5-20251001": "anthropic/claude-haiku-4.5",
  "claude-haiku-4-5": "anthropic/claude-haiku-4.5",
  "claude-opus-4-0": "anthropic/claude-opus-4",
  "claude-opus-4-5-20251101": "anthropic/claude-opus-4.5",
  "claude-opus-4-5": "anthropic/claude-opus-4.5",
  "claude-sonnet-4-0": "anthropic/claude-sonnet-4",
  "claude-sonnet-4-5-20250929": "anthropic/claude-sonnet-4.5",
  "claude-sonnet-4-5": "anthropic/claude-sonnet-4.5",

  // OpenAI models
  "gpt-5": "openai/gpt-5",
  "gpt-5-mini": "openai/gpt-5-mini",
  "gpt-5-nano": "openai/gpt-5-nano",
  "gpt-5.1": "openai/gpt-5.1",
  "gpt-4.1": "openai/gpt-4.1",
  "gpt-4.1-mini": "openai/gpt-4.1-mini",
  "gpt-4.1-nano": "openai/gpt-4.1-nano",
  "gpt-4o": "openai/gpt-4o",
  "gpt-4o-2024-11-20": "openai/gpt-4o-2024-11-20",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "chatgpt-4o-latest": "openai/chatgpt-4o-latest",
  "gpt-4-turbo": "openai/gpt-4-turbo",
  "o1": "openai/o1",
  "o3-mini": "openai/o3-mini",

  // Google models
  "gemini-2.5-flash-lite": "google/gemini-2.5-flash-lite",
  "gemini-2.5-flash": "google/gemini-2.5-flash",
  "gemini-2.5-pro": "google/gemini-2.5-pro",
  "gemini-1.5-flash": "google/gemini-flash-1.5",
  "gemini-1.5-flash-8b": "google/gemini-flash-1.5-8b",
  "gemini-1.5-pro": "google/gemini-pro-1.5",
  "gemini-3-pro-preview": "google/gemini-3-pro-preview",
};

/**
 * Get the OpenRouter model ID for a given internal model ID
 */
export function getOpenRouterModelId(internalId: string): string | null {
  return MODEL_ID_TO_OPENROUTER[internalId] || null;
}

/**
 * Determine which provider "owns" a model based on its ID
 */
export function getModelProvider(modelId: string): "anthropic" | "openai" | "google" | null {
  if (modelId.startsWith("claude") || modelId.includes("anthropic")) {
    return "anthropic";
  }
  if (modelId.startsWith("gpt") || modelId.startsWith("chatgpt") || modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4")) {
    return "openai";
  }
  if (modelId.startsWith("gemini")) {
    return "google";
  }
  return null;
}

/**
 * Error types for OpenRouter/AI SDK errors
 * (Re-exported from consensus-events for convenience)
 */
export type { AIErrorType } from './consensus-events';

export interface ParsedAIError {
  type: AIErrorType;
  message: string;
  statusCode?: number;
}

/**
 * Parse AI SDK errors to extract meaningful error info
 * AI SDK wraps errors deeply, so we need to traverse the error chain
 */
export function parseAIError(error: unknown): ParsedAIError {
  // Default result
  const result: ParsedAIError = {
    type: 'generic',
    message: error instanceof Error ? error.message : 'Unknown error',
  };

  // Helper to recursively extract error data
  function extractErrorData(obj: unknown, depth = 0): { statusCode?: number; responseBody?: string; message?: string } {
    if (depth > 5 || !obj || typeof obj !== 'object') return {};

    const data: { statusCode?: number; responseBody?: string; message?: string } = {};
    const objAny = obj as Record<string, unknown>;

    // Extract direct properties
    if (typeof objAny.statusCode === 'number') data.statusCode = objAny.statusCode;
    if (typeof objAny.responseBody === 'string') data.responseBody = objAny.responseBody;
    if (typeof objAny.message === 'string') data.message = objAny.message;

    // Check nested error objects
    if (objAny.lastError && typeof objAny.lastError === 'object') {
      const nested = extractErrorData(objAny.lastError, depth + 1);
      Object.assign(data, nested);
    }
    if (objAny.cause && typeof objAny.cause === 'object') {
      const nested = extractErrorData(objAny.cause, depth + 1);
      Object.assign(data, nested);
    }
    if (objAny.error && typeof objAny.error === 'object') {
      const nested = extractErrorData(objAny.error, depth + 1);
      Object.assign(data, nested);
    }

    return data;
  }

  const errorData = extractErrorData(error);
  result.statusCode = errorData.statusCode;

  // Combine all text for pattern matching
  const allText = [
    errorData.message || '',
    errorData.responseBody || '',
    result.message,
  ].join(' ').toLowerCase();

  // Check for rate limit (429)
  if (errorData.statusCode === 429 || allText.includes('rate-limited') || allText.includes('rate limit')) {
    result.type = 'rate-limit';
    result.message = 'This model is temporarily rate-limited. Please wait a moment and try again, or add your own API key for higher limits.';
  }
  // Check for OpenRouter privacy policy error
  else if (allText.includes('data policy') || allText.includes('no endpoints found matching')) {
    result.type = 'openrouter-privacy';
    result.message = 'OpenRouter privacy settings need to be configured to use this model. Please visit openrouter.ai/settings/privacy to update your data policy settings.';
  }

  return result;
}

/**
 * Check if OpenRouter API key is valid by making a test request
 */
export async function checkOpenRouterAvailability(apiKey: string): Promise<{
  available: boolean;
  error?: string;
}> {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      return {
        available: false,
        error: `API returned ${response.status}`,
      };
    }

    return { available: true };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}
