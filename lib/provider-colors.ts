// Provider color definitions for consistent styling across the app
// Each provider gets a unique color for visual distinction

export const PROVIDER_COLORS: Record<string, string> = {
  // Big 3
  anthropic: "bg-orange-500/20 text-orange-600 dark:text-orange-400 border-orange-500/30",
  openai: "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30",
  google: "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
  // Other major providers
  meta: "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  "meta-llama": "bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
  mistral: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  mistralai: "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  "mistral-ai": "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
  cohere: "bg-pink-500/20 text-pink-600 dark:text-pink-400 border-pink-500/30",
  perplexity: "bg-cyan-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
  deepseek: "bg-violet-500/20 text-violet-600 dark:text-violet-400 border-violet-500/30",
  xai: "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30",
  "x-ai": "bg-slate-500/20 text-slate-600 dark:text-slate-400 border-slate-500/30",
  ai21: "bg-rose-500/20 text-rose-600 dark:text-rose-400 border-rose-500/30",
  // Chinese providers (GLM/Z AI)
  zhipu: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  thudm: "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  "z-ai": "bg-red-500/20 text-red-600 dark:text-red-400 border-red-500/30",
  // Alibaba/Qwen
  qwen: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30",
  alibaba: "bg-sky-500/20 text-sky-600 dark:text-sky-400 border-sky-500/30",
};

// Fallback colors for unknown providers (cycle through these)
const FALLBACK_COLORS = [
  "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30",
  "bg-teal-500/20 text-teal-600 dark:text-teal-400 border-teal-500/30",
  "bg-fuchsia-500/20 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/30",
  "bg-lime-500/20 text-lime-600 dark:text-lime-400 border-lime-500/30",
  "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
];

// Guaranteed fallback that's always visible (purple - colorful, not gray/white)
const DEFAULT_FALLBACK = "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30";

// Cache for consistent fallback colors per unknown provider
const fallbackCache: Record<string, string> = {};
let fallbackIndex = 0;

export function getProviderColor(provider: string): string {
  // Normalize provider string (lowercase, handle undefined/null)
  const normalizedProvider = (provider || "").toLowerCase().trim();

  // Return default fallback for empty providers
  if (!normalizedProvider) {
    return DEFAULT_FALLBACK;
  }

  // Check known providers first (try exact match)
  if (PROVIDER_COLORS[normalizedProvider]) {
    return PROVIDER_COLORS[normalizedProvider];
  }

  // For unknown providers, assign a consistent fallback color
  if (!fallbackCache[normalizedProvider]) {
    fallbackCache[normalizedProvider] = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
    fallbackIndex++;
  }

  return fallbackCache[normalizedProvider] || DEFAULT_FALLBACK;
}
