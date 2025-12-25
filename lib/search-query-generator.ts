import { generateText } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

/**
 * Generate a focused search query from a user prompt using an LLM
 */
export async function generateSearchQuery(
  prompt: string,
  apiKey: string,
  provider: "anthropic" | "openai" | "google",
  model: string
): Promise<string> {
  const providerInstance =
    provider === "anthropic"
      ? createAnthropic({ apiKey })
      : provider === "google"
        ? createGoogleGenerativeAI({ apiKey })
        : createOpenAI({ apiKey });

  const result = await generateText({
    model: providerInstance(model),
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
