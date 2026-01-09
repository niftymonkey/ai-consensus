/**
 * Model Instance Creation
 *
 * Creates AI model instances for use with the Vercel AI SDK.
 * Uses the shared routing logic from model-routing.ts to determine
 * which provider SDK to use.
 */

import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouterProvider } from "./openrouter";
import {
  resolveProvider,
  extractDirectModelId,
  isDirectProviderName,
} from "./model-routing";

/**
 * Get the appropriate model instance for a provider/model combination.
 * Uses shared routing logic from model-routing.ts.
 *
 * Priority: direct provider key > OpenRouter
 *
 * Note: The apiKey passed should already be the correct key for the route
 * (direct key if using direct provider, OpenRouter key if using OpenRouter).
 * The provider and model parameters help determine which SDK to use.
 *
 * @param apiKey - The API key to use (must be the correct key for the chosen route)
 * @param provider - The provider name (used as fallback if not extractable from model)
 * @param model - The model ID (can be in OpenRouter format like "anthropic/claude-3.7-sonnet"
 *                or direct format like "claude-3-7-sonnet-20250219")
 * @returns A model instance compatible with the Vercel AI SDK
 */
export function getModelInstance(
  apiKey: string,
  provider: string,
  model: string
) {
  // Extract the actual provider from model ID (handles OpenRouter format)
  const extractedProvider = resolveProvider(model) || provider;

  // Check if this is a direct provider
  if (isDirectProviderName(extractedProvider)) {
    // Use direct provider SDK with extracted model ID
    const directModelId = extractDirectModelId(model);
    const providerInstance =
      extractedProvider === "anthropic"
        ? createAnthropic({ apiKey })
        : extractedProvider === "google"
          ? createGoogleGenerativeAI({ apiKey })
          : createOpenAI({ apiKey });

    return providerInstance(directModelId);
  }

  // Non-direct provider - use OpenRouter
  const openrouterProvider = createOpenRouterProvider(apiKey);
  return openrouterProvider.chat(model);
}
