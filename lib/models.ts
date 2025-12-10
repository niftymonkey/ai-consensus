// Model configurations for each AI provider

export const ANTHROPIC_MODELS = [
  { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' },
  { id: 'claude-3-5-haiku-latest', name: 'Claude 3.5 Haiku (Latest)' },
  { id: 'claude-3-7-sonnet-20250219', name: 'Claude 3.7 Sonnet' },
  { id: 'claude-3-7-sonnet-latest', name: 'Claude 3.7 Sonnet (Latest)' },
  { id: 'claude-haiku-4-5-20251001', name: 'Claude Haiku 4.5' },
  { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5 (Latest)' },
  { id: 'claude-opus-4-0', name: 'Claude Opus 4.0' },
  { id: 'claude-opus-4-5-20251101', name: 'Claude Opus 4.5' },
  { id: 'claude-opus-4-5', name: 'Claude Opus 4.5 (Latest)' },
  { id: 'claude-sonnet-4-0', name: 'Claude Sonnet 4.0' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5' },
  { id: 'claude-sonnet-4-5', name: 'Claude Sonnet 4.5 (Latest)' },
] as const;

export const OPENAI_MODELS = [
  { id: 'gpt-5-chat-latest', name: 'GPT-5 Chat (Latest)' },
  { id: 'gpt-5', name: 'GPT-5' },
  { id: 'gpt-5-mini', name: 'GPT-5 Mini' },
  { id: 'gpt-5-nano', name: 'GPT-5 Nano' },
  { id: 'gpt-5.1', name: 'GPT-5.1' },
  { id: 'gpt-5.1-chat-latest', name: 'GPT-5.1 Chat (Latest)' },
  { id: 'gpt-4.1', name: 'GPT-4.1' },
  { id: 'gpt-4.1-mini', name: 'GPT-4.1 Mini' },
  { id: 'gpt-4.1-nano', name: 'GPT-4.1 Nano' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'gpt-4o-2024-11-20', name: 'GPT-4o (Nov 2024)' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'chatgpt-4o-latest', name: 'ChatGPT-4o (Latest)' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
  { id: 'o1', name: 'o1' },
  { id: 'o3-mini', name: 'o3 Mini' },
] as const;

export const GOOGLE_MODELS = [
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash Lite' },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash' },
  { id: 'gemini-2.0-flash-lite', name: 'Gemini 2.0 Flash Lite' },
  { id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash (Experimental)' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
  { id: 'gemini-1.5-flash-8b', name: 'Gemini 1.5 Flash 8B' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
  { id: 'gemini-3-pro-preview', name: 'Gemini 3 Pro (Preview)' },
  { id: 'gemini-flash-latest', name: 'Gemini Flash (Latest)' },
  { id: 'gemini-flash-lite-latest', name: 'Gemini Flash Lite (Latest)' },
] as const;

export type AnthropicModelId = typeof ANTHROPIC_MODELS[number]['id'];
export type OpenAIModelId = typeof OPENAI_MODELS[number]['id'];
export type GoogleModelId = typeof GOOGLE_MODELS[number]['id'];

// Unified model interface with provider information
export interface UnifiedModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
}

export interface ProviderModels {
  anthropic: UnifiedModel[];
  openai: UnifiedModel[];
  google: UnifiedModel[];
}

// Unified exports with provider field
export const UNIFIED_MODELS: ProviderModels = {
  anthropic: ANTHROPIC_MODELS.map(m => ({ ...m, provider: 'anthropic' as const })),
  openai: OPENAI_MODELS.map(m => ({ ...m, provider: 'openai' as const })),
  google: GOOGLE_MODELS.map(m => ({ ...m, provider: 'google' as const }))
};

// Flat list of all models for easy iteration
export const ALL_MODELS: UnifiedModel[] = [
  ...UNIFIED_MODELS.anthropic,
  ...UNIFIED_MODELS.openai,
  ...UNIFIED_MODELS.google
];
