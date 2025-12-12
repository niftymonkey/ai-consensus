// Model configurations for each AI provider

export const ANTHROPIC_MODELS = [
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    description: 'Fast, efficient model for everyday tasks and quick responses',
    contextWindow: 200000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 1, output: 5 }
  },
  {
    id: 'claude-3-5-haiku-latest',
    name: 'Claude 3.5 Haiku (Latest)',
    description: 'Fast, efficient model for everyday tasks and quick responses',
    contextWindow: 200000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 0.8, output: 4 }
  },
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    description: 'Balanced performance for complex reasoning and coding tasks',
    contextWindow: 200000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 3, output: 15 }
  },
  {
    id: 'claude-3-7-sonnet-latest',
    name: 'Claude 3.7 Sonnet (Latest)',
    description: 'Balanced performance for complex reasoning and coding tasks',
    contextWindow: 200000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 3, output: 15 }
  },
  {
    id: 'claude-haiku-4-5-20251001',
    name: 'Claude Haiku 4.5',
    description: 'Fastest and most efficient model, delivering near-frontier intelligence',
    contextWindow: 200000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 1, output: 5 }
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5 (Latest)',
    description: 'Fastest and most efficient model, delivering near-frontier intelligence',
    contextWindow: 200000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 1, output: 5 }
  },
  {
    id: 'claude-opus-4-0',
    name: 'Claude Opus 4.0',
    description: 'Most capable model for complex tasks requiring deep reasoning',
    contextWindow: 200000,
    speed: 'slow' as const,
    costTier: 'premium' as const,
    modality: 'text+image->text',
    pricing: { input: 15, output: 75 }
  },
  {
    id: 'claude-opus-4-5-20251101',
    name: 'Claude Opus 4.5',
    description: 'Frontier reasoning model optimized for complex software engineering',
    contextWindow: 200000,
    speed: 'slow' as const,
    costTier: 'premium' as const,
    modality: 'text+image->text',
    pricing: { input: 5, output: 25 }
  },
  {
    id: 'claude-opus-4-5',
    name: 'Claude Opus 4.5 (Latest)',
    description: 'Frontier reasoning model optimized for complex software engineering',
    contextWindow: 200000,
    speed: 'slow' as const,
    costTier: 'premium' as const,
    modality: 'text+image->text',
    pricing: { input: 5, output: 25 }
  },
  {
    id: 'claude-sonnet-4-0',
    name: 'Claude Sonnet 4.0',
    description: 'Balanced model for real-world agents and complex coding',
    contextWindow: 200000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 3, output: 15 }
  },
  {
    id: 'claude-sonnet-4-5-20250929',
    name: 'Claude Sonnet 4.5',
    description: 'Most advanced Sonnet model, optimized for real-world agents and coding',
    contextWindow: 1000000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    recommended: true,
    pricing: { input: 3, output: 15 }
  },
  {
    id: 'claude-sonnet-4-5',
    name: 'Claude Sonnet 4.5 (Latest)',
    description: 'Most advanced Sonnet model, optimized for real-world agents and coding',
    contextWindow: 1000000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 3, output: 15 }
  },
] as const;

export const OPENAI_MODELS = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    description: 'Frontier model with strong general reasoning and instruction adherence',
    contextWindow: 400000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 1.25, output: 10 }
  },
  {
    id: 'gpt-5-mini',
    name: 'GPT-5 Mini',
    description: 'Efficient variant for faster responses and lower cost',
    contextWindow: 400000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 0.25, output: 2 }
  },
  {
    id: 'gpt-5-nano',
    name: 'GPT-5 Nano',
    description: 'Ultra-fast, cost-effective model for simple tasks',
    contextWindow: 128000,
    speed: 'fast' as const,
    costTier: 'free' as const,
    modality: 'text->text',
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'gpt-5.1',
    name: 'GPT-5.1',
    description: 'Latest frontier-grade model with stronger general-purpose reasoning',
    contextWindow: 400000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    recommended: true,
    pricing: { input: 1.25, output: 10 }
  },
  {
    id: 'gpt-4.1',
    name: 'GPT-4.1',
    description: 'Advanced reasoning model with reliable performance',
    contextWindow: 128000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 2, output: 8 }
  },
  {
    id: 'gpt-4.1-mini',
    name: 'GPT-4.1 Mini',
    description: 'Faster, more affordable variant of GPT-4.1',
    contextWindow: 128000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 0.4, output: 1.6 }
  },
  {
    id: 'gpt-4.1-nano',
    name: 'GPT-4.1 Nano',
    description: 'Ultra-efficient model for quick, simple tasks',
    contextWindow: 128000,
    speed: 'fast' as const,
    costTier: 'free' as const,
    modality: 'text->text',
    pricing: { input: 0, output: 0 }
  },
  {
    id: 'gpt-4o',
    name: 'GPT-4o',
    description: 'Versatile model balancing capability with cost-effectiveness',
    contextWindow: 128000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 2.5, output: 10 }
  },
  {
    id: 'gpt-4o-2024-11-20',
    name: 'GPT-4o (Nov 2024)',
    description: 'Specific snapshot of GPT-4o from November 2024',
    contextWindow: 128000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 2.5, output: 10 }
  },
  {
    id: 'gpt-4o-mini',
    name: 'GPT-4o Mini',
    description: 'Smaller, faster variant of GPT-4o for everyday use',
    contextWindow: 128000,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 0.15, output: 0.6 }
  },
  {
    id: 'chatgpt-4o-latest',
    name: 'ChatGPT-4o (Latest)',
    description: 'Latest ChatGPT variant optimized for conversations',
    contextWindow: 128000,
    speed: 'fast' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 5, output: 15 }
  },
  {
    id: 'gpt-4-turbo',
    name: 'GPT-4 Turbo',
    description: 'Enhanced GPT-4 with improved speed and efficiency',
    contextWindow: 128000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 10, output: 30 }
  },
  {
    id: 'o1',
    name: 'o1',
    description: 'Advanced reasoning model for complex problem-solving',
    contextWindow: 200000,
    speed: 'slow' as const,
    costTier: 'premium' as const,
    modality: 'text+image->text',
    pricing: { input: 15, output: 60 }
  },
  {
    id: 'o3-mini',
    name: 'o3 Mini',
    description: 'Efficient reasoning model for research and analysis',
    contextWindow: 200000,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 1.1, output: 4.4 }
  },
] as const;

export const GOOGLE_MODELS = [
  {
    id: 'gemini-2.5-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Ultra-fast, lightweight model for quick responses',
    contextWindow: 32768,
    speed: 'fast' as const,
    costTier: 'free' as const,
    modality: 'text+image->text',
    pricing: { input: 0.1, output: 0.4 }
  },
  {
    id: 'gemini-2.5-flash',
    name: 'Gemini 2.5 Flash',
    description: 'Fast image generation model with contextual understanding',
    contextWindow: 32768,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text+image',
    pricing: { input: 0.3, output: 2.5 }
  },
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Advanced multimodal model for complex tasks',
    contextWindow: 1048576,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    recommended: true,
    pricing: { input: 1.25, output: 10 }
  },
  {
    id: 'gemini-1.5-flash',
    name: 'Gemini 1.5 Flash',
    description: 'Previous generation fast model, reliable and tested',
    contextWindow: 1048576,
    speed: 'fast' as const,
    costTier: 'budget' as const,
    modality: 'text+image->text',
    pricing: { input: 0.075, output: 0.3 }
  },
  {
    id: 'gemini-1.5-flash-8b',
    name: 'Gemini 1.5 Flash 8B',
    description: 'Smaller, faster variant optimized for efficiency',
    contextWindow: 1048576,
    speed: 'fast' as const,
    costTier: 'free' as const,
    modality: 'text+image->text',
    pricing: { input: 0.0375, output: 0.15 }
  },
  {
    id: 'gemini-1.5-pro',
    name: 'Gemini 1.5 Pro',
    description: 'Balanced performance for complex reasoning',
    contextWindow: 2097152,
    speed: 'balanced' as const,
    costTier: 'standard' as const,
    modality: 'text+image->text',
    pricing: { input: 1.25, output: 5 }
  },
  {
    id: 'gemini-3-pro-preview',
    name: 'Gemini 3 Pro (Preview)',
    description: 'Flagship frontier model for high-precision multimodal reasoning',
    contextWindow: 1048576,
    speed: 'balanced' as const,
    costTier: 'premium' as const,
    modality: 'text+image->text',
    pricing: { input: 2, output: 12 }
  },
] as const;

export type AnthropicModelId = typeof ANTHROPIC_MODELS[number]['id'];
export type OpenAIModelId = typeof OPENAI_MODELS[number]['id'];
export type GoogleModelId = typeof GOOGLE_MODELS[number]['id'];

// Unified model interface with provider information and metadata
export interface UnifiedModel {
  id: string;
  name: string;
  provider: 'anthropic' | 'openai' | 'google';
  description?: string;           // Brief capability description
  contextWindow?: number;         // Context length in tokens
  speed?: 'fast' | 'balanced' | 'slow';  // Performance tier
  costTier?: 'free' | 'budget' | 'standard' | 'premium';  // Relative pricing
  modality?: string;              // e.g., "text+image->text"
  recommended?: boolean;          // Flag for evaluator dropdown organization
  pricing?: {
    input: number;                // Cost per 1M input tokens in USD
    output: number;               // Cost per 1M output tokens in USD
  };
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
