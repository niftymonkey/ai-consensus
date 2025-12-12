/**
 * Script to add pricing data to lib/models.ts
 * Run with: pnpm tsx scripts/add-pricing-to-models.ts
 */

import fs from 'fs';
import path from 'path';

const PRICING_DATA: Record<string, { input: number; output: number }> = {
  "claude-3-5-haiku-20241022": { "input": 0.8, "output": 4 },
  "claude-3-5-haiku-latest": { "input": 0.8, "output": 4 },
  "claude-3-7-sonnet-20250219": { "input": 3, "output": 15 },
  "claude-3-7-sonnet-latest": { "input": 3, "output": 15 },
  "claude-haiku-4-5-20251001": { "input": 1, "output": 5 },
  "claude-haiku-4-5": { "input": 1, "output": 5 },
  "claude-opus-4-0": { "input": 15, "output": 75 },
  "claude-opus-4-5-20251101": { "input": 5, "output": 25 },
  "claude-opus-4-5": { "input": 5, "output": 25 },
  "claude-sonnet-4-0": { "input": 3, "output": 15 },
  "claude-sonnet-4-5-20250929": { "input": 3, "output": 15 },
  "claude-sonnet-4-5": { "input": 3, "output": 15 },
  "gpt-5-chat-latest": { "input": 1.75, "output": 14 },
  "gpt-5": { "input": 1.25, "output": 10 },
  "gpt-5-mini": { "input": 0.25, "output": 2 },
  "gpt-5-nano": { "input": 0, "output": 0 },
  "gpt-5.1": { "input": 1.25, "output": 10 },
  "gpt-5.1-chat-latest": { "input": 1.25, "output": 10 },
  "gpt-4.1": { "input": 2, "output": 8 },
  "gpt-4.1-mini": { "input": 0.4, "output": 1.6 },
  "gpt-4.1-nano": { "input": 0, "output": 0 },
  "gpt-4o": { "input": 2.5, "output": 10 },
  "gpt-4o-2024-11-20": { "input": 2.5, "output": 10 },
  "gpt-4o-mini": { "input": 0.15, "output": 0.6 },
  "chatgpt-4o-latest": { "input": 5, "output": 15 },
  "gpt-4-turbo": { "input": 10, "output": 30 },
  "o1": { "input": 15, "output": 60 },
  "o3-mini": { "input": 1.1, "output": 4.4 },
  "gemini-2.5-flash-lite": { "input": 0.1, "output": 0.4 },
  "gemini-2.5-flash": { "input": 0.3, "output": 2.5 },
  "gemini-2.5-pro": { "input": 1.25, "output": 10 },
  "gemini-2.0-flash": { "input": 0, "output": 0 },
  "gemini-2.0-flash-lite": { "input": 0, "output": 0 },
  "gemini-2.0-flash-exp": { "input": 0, "output": 0 },
  "gemini-1.5-flash": { "input": 0.075, "output": 0.3 },
  "gemini-1.5-flash-8b": { "input": 0.0375, "output": 0.15 },
  "gemini-1.5-pro": { "input": 1.25, "output": 5 },
  "gemini-3-pro-preview": { "input": 2, "output": 12 },
  "gemini-flash-latest": { "input": 0, "output": 0 },
  "gemini-flash-lite-latest": { "input": 0, "output": 0 }
};

const modelsPath = path.join(__dirname, '../lib/models.ts');
let content = fs.readFileSync(modelsPath, 'utf-8');

// Process each model ID
Object.entries(PRICING_DATA).forEach(([modelId, pricing]) => {
  // Find the model definition with this ID
  const idPattern = new RegExp(`(\\s+id:\\s*'${modelId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}',\\s*\\n(?:.|\\n)*?)(\\n\\s+\\})`, 'g');

  content = content.replace(idPattern, (match, before, after) => {
    // Check if pricing already exists
    if (before.includes('pricing:')) {
      return match; // Skip if already has pricing
    }

    // Add pricing before the closing brace
    const pricingLine = pricing.input === 0 && pricing.output === 0
      ? `    pricing: { input: 0, output: 0 }`
      : `    pricing: { input: ${pricing.input}, output: ${pricing.output} }`;

    return before + ',\n' + pricingLine + after;
  });
});

fs.writeFileSync(modelsPath, content);
console.log('✓ Added pricing data to models.ts');
