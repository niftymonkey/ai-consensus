/**
 * Script to fetch model pricing from OpenRouter and update lib/models.ts
 * Run with: pnpm tsx scripts/update-model-pricing.ts
 */

interface OpenRouterModel {
  id: string;
  pricing: {
    prompt: string;
    completion: string;
  };
}

async function fetchOpenRouterPricing() {
  const response = await fetch('https://openrouter.ai/api/v1/models');
  const data = await response.json();
  return data.data as OpenRouterModel[];
}

// Mapping from our model IDs to OpenRouter IDs
const MODEL_ID_MAP: Record<string, string> = {
  // Anthropic
  'claude-3-5-haiku-20241022': 'anthropic/claude-3.5-haiku',
  'claude-3-5-haiku-latest': 'anthropic/claude-3.5-haiku',
  'claude-3-7-sonnet-20250219': 'anthropic/claude-3.7-sonnet',
  'claude-3-7-sonnet-latest': 'anthropic/claude-3.7-sonnet',
  'claude-haiku-4-5-20251001': 'anthropic/claude-haiku-4.5',
  'claude-haiku-4-5': 'anthropic/claude-haiku-4.5',
  'claude-opus-4-0': 'anthropic/claude-opus-4',
  'claude-opus-4-5-20251101': 'anthropic/claude-opus-4.5',
  'claude-opus-4-5': 'anthropic/claude-opus-4.5',
  'claude-sonnet-4-0': 'anthropic/claude-sonnet-4',
  'claude-sonnet-4-5-20250929': 'anthropic/claude-sonnet-4.5',
  'claude-sonnet-4-5': 'anthropic/claude-sonnet-4.5',

  // OpenAI
  'gpt-5-chat-latest': 'openai/gpt-5-chat-latest',
  'gpt-5': 'openai/gpt-5',
  'gpt-5-mini': 'openai/gpt-5-mini',
  'gpt-5-nano': 'openai/gpt-5-nano',
  'gpt-5.1': 'openai/gpt-5.1',
  'gpt-5.1-chat-latest': 'openai/gpt-5.1-chat-latest',
  'gpt-4.1': 'openai/gpt-4.1',
  'gpt-4.1-mini': 'openai/gpt-4.1-mini',
  'gpt-4.1-nano': 'openai/gpt-4.1-nano',
  'gpt-4o': 'openai/gpt-4o',
  'gpt-4o-2024-11-20': 'openai/gpt-4o-2024-11-20',
  'gpt-4o-mini': 'openai/gpt-4o-mini',
  'chatgpt-4o-latest': 'openai/chatgpt-4o-latest',
  'gpt-4-turbo': 'openai/gpt-4-turbo',
  'o1': 'openai/o1',
  'o3-mini': 'openai/o3-mini',

  // Google
  'gemini-2.5-flash-lite': 'google/gemini-2.5-flash-lite',
  'gemini-2.5-flash': 'google/gemini-2.5-flash',
  'gemini-2.5-pro': 'google/gemini-2.5-pro',
  'gemini-2.0-flash': 'google/gemini-2.0-flash',
  'gemini-2.0-flash-lite': 'google/gemini-2.0-flash-lite',
  'gemini-2.0-flash-exp': 'google/gemini-2.0-flash-exp',
  'gemini-1.5-flash': 'google/gemini-1.5-flash',
  'gemini-1.5-flash-8b': 'google/gemini-1.5-flash-8b',
  'gemini-1.5-pro': 'google/gemini-1.5-pro',
  'gemini-3-pro-preview': 'google/gemini-3-pro-preview',
  'gemini-flash-latest': 'google/gemini-flash-latest',
  'gemini-flash-lite-latest': 'google/gemini-flash-lite-latest',
};

async function main() {
  const models = await fetchOpenRouterPricing();

  console.log('Fetched pricing for', models.length, 'models from OpenRouter\n');

  // Create pricing map
  const pricingMap = new Map<string, { input: number; output: number }>();

  models.forEach(model => {
    const inputCostPerToken = parseFloat(model.pricing.prompt);
    const outputCostPerToken = parseFloat(model.pricing.completion);

    // Convert to per 1M tokens
    const inputPer1M = Math.round(inputCostPerToken * 1_000_000 * 100) / 100;
    const outputPer1M = Math.round(outputCostPerToken * 1_000_000 * 100) / 100;

    pricingMap.set(model.id, {
      input: inputPer1M,
      output: outputPer1M
    });
  });

  // Output pricing for our models
  console.log('Pricing data for our models:\n');
  Object.entries(MODEL_ID_MAP).forEach(([ourId, openRouterId]) => {
    const pricing = pricingMap.get(openRouterId);
    if (pricing) {
      console.log(`  '${ourId}': { input: ${pricing.input}, output: ${pricing.output} },`);
    } else {
      console.log(`  '${ourId}': NOT FOUND in OpenRouter`);
    }
  });
}

main().catch(console.error);
