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
