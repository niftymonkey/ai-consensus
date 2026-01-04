/**
 * Model Detection Tests
 *
 * Run manually: npx tsx lib/__tests__/model-detection.test.ts
 * Will integrate with Vitest when test infrastructure is added.
 *
 * These tests ensure that all curated model IDs are correctly
 * mapped to their providers, preventing routing errors like
 * the chatgpt-4o-latest -> unknown bug.
 */

import { getModelProvider } from '../openrouter';
import { ANTHROPIC_MODELS, OPENAI_MODELS, GOOGLE_MODELS } from '../models';

// Also test the consensus route's evaluator detection (same logic)
function getEvaluatorProvider(modelId: string): string {
  if (modelId.includes("/")) {
    return modelId.split("/")[0];
  }
  if (modelId.startsWith("claude")) return "anthropic";
  if (modelId.startsWith("gemini")) return "google";
  if (modelId.startsWith("gpt") || modelId.startsWith("chatgpt") || modelId.startsWith("o1") || modelId.startsWith("o3") || modelId.startsWith("o4")) return "openai";
  return "unknown";
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.log(`✗ ${name}`);
    console.log(`  ${e.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
    }
  };
}

console.log("\n=== Model Detection Tests ===\n");

// Test all Anthropic models
console.log("Anthropic Models:");
for (const model of ANTHROPIC_MODELS) {
  test(`${model.id} -> anthropic`, () => {
    expect(getModelProvider(model.id)).toBe("anthropic");
    expect(getEvaluatorProvider(model.id)).toBe("anthropic");
  });
}

// Test all OpenAI models
console.log("\nOpenAI Models:");
for (const model of OPENAI_MODELS) {
  test(`${model.id} -> openai`, () => {
    expect(getModelProvider(model.id)).toBe("openai");
    expect(getEvaluatorProvider(model.id)).toBe("openai");
  });
}

// Test all Google models
console.log("\nGoogle Models:");
for (const model of GOOGLE_MODELS) {
  test(`${model.id} -> google`, () => {
    expect(getModelProvider(model.id)).toBe("google");
    expect(getEvaluatorProvider(model.id)).toBe("google");
  });
}

// Test OpenRouter format (provider/model)
console.log("\nOpenRouter Format:");
test("openai/gpt-4o -> openai", () => {
  expect(getEvaluatorProvider("openai/gpt-4o")).toBe("openai");
});
test("anthropic/claude-3.5-sonnet -> anthropic", () => {
  expect(getEvaluatorProvider("anthropic/claude-3.5-sonnet")).toBe("anthropic");
});
test("google/gemini-2.5-pro -> google", () => {
  expect(getEvaluatorProvider("google/gemini-2.5-pro")).toBe("google");
});

// Summary
console.log("\n=== Summary ===");
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
