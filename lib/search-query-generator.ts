import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenRouterProvider } from "./openrouter";

// Direct providers we support with API keys
const DIRECT_PROVIDERS = ["anthropic", "openai", "google"] as const;

/**
 * Get the appropriate model instance for a provider/model combination
 * Handles both direct providers and OpenRouter
 */
function getModelInstance(apiKey: string, provider: string, model: string) {
  const isDirectProvider = DIRECT_PROVIDERS.includes(provider as typeof DIRECT_PROVIDERS[number]);
  const isOpenRouterModel = model.includes("/"); // OpenRouter models have format "provider/model"

  // Use OpenRouter if model is in OpenRouter format or provider isn't direct
  if (isOpenRouterModel || !isDirectProvider) {
    const openrouterProvider = createOpenRouterProvider(apiKey);
    return openrouterProvider.chat(model);
  }

  // Use direct provider
  const providerInstance =
    provider === "anthropic"
      ? createAnthropic({ apiKey })
      : provider === "google"
        ? createGoogleGenerativeAI({ apiKey })
        : createOpenAI({ apiKey });

  return providerInstance(model);
}

/**
 * Check if a prompt requires current web information to answer well
 */
export async function shouldSearchWeb(
  prompt: string,
  apiKey: string,
  provider: string,
  model: string
): Promise<boolean> {
  const result = await generateText({
    model: getModelInstance(apiKey, provider, model),
    system: `You are a search necessity evaluator. Determine if a question requires current, up-to-date web information to answer well.

Answer "yes" if the question:
- Asks about recent events, news, or current state
- Requires latest statistics, prices, or data
- References specific recent dates or timeframes
- Needs current best practices or recommendations that change frequently

Answer "no" if the question:
- Is about timeless concepts (math, logic, general knowledge)
- Can be answered with established facts or principles
- Is hypothetical or opinion-based
- Asks for explanations of well-established topics

Return ONLY "yes" or "no", nothing else.`,
    prompt,
  });

  return result.text.trim().toLowerCase() === "yes";
}

/**
 * Generate a focused search query from a user prompt using an LLM
 */
export async function generateSearchQuery(
  prompt: string,
  apiKey: string,
  provider: string,
  model: string
): Promise<string> {
  const result = await generateText({
    model: getModelInstance(apiKey, provider, model),
    system: `You are a search query generator. Given a user's question or prompt, generate a focused web search query that would find the most relevant, current information to answer the question.

Guidelines:
- Keep the query concise (3-8 words)
- Focus on key concepts and entities
- Prefer recent/current information when relevant
- Remove conversational fluff
- Include relevant context from the prompt

Examples:
User: "What's the latest on the SpaceX Starship program?"
Query: SpaceX Starship latest updates 2025

User: "How does Anthropic's Claude compare to GPT-4?"
Query: Claude vs GPT-4 comparison benchmarks

User: "What are best practices for React Server Components?"
Query: React Server Components best practices

Return ONLY the search query, nothing else.`,
    prompt,
  });

  return result.text.trim();
}
