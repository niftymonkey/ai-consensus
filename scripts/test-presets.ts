/**
 * Test script to verify preset model selection against real OpenRouter catalog
 *
 * Usage: pnpm tsx scripts/test-presets.ts
 */

import { PRESETS, resolvePreset, scoreModelForPurpose, extractVersion, type PresetId } from "../lib/presets";
import { fetchOpenRouterModels, type OpenRouterModelWithMeta } from "../lib/openrouter-models";

function debugTopModels(purpose: "casual" | "balanced" | "research" | "coding" | "creative", models: OpenRouterModelWithMeta[]) {
  const scored = models
    .filter(m => {
      const outputs = m.architecture?.output_modalities || [];
      return outputs.includes("text") && !outputs.some(o => ["image", "audio", "video"].includes(o));
    })
    .map(m => ({
      id: m.id,
      shortName: m.shortName,
      provider: m.provider,
      score: scoreModelForPurpose(m, purpose),
      version: extractVersion(m.id),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  console.log(`\nTop 10 models for ${purpose}:`);
  scored.forEach((m, i) => {
    console.log(`  ${i + 1}. ${m.shortName} (${m.provider}) - score: ${m.score.toFixed(1)}, version: ${m.version}`);
  });
}

function printPresetResults(presetId: PresetId, models: OpenRouterModelWithMeta[]) {
  const preset = PRESETS[presetId];

  console.log("=".repeat(60));
  console.log(`${preset.icon} ${preset.name.toUpperCase()}`);
  console.log(`   "${preset.description}"`);
  console.log(`   Settings: ${preset.modelCount} models, ${preset.maxRounds} rounds, ${preset.consensusThreshold}% threshold${preset.enableSearch ? ", search enabled" : ""}`);
  console.log("-".repeat(60));

  try {
    const resolved = resolvePreset(presetId, models);

    console.log("\nSelected Models:");
    resolved.selectedModels.forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.shortName}`);
      console.log(`     ID: ${m.id}`);
      console.log(`     Provider: ${m.provider}`);
      console.log(`     Cost: $${m.costPerMillionInput}/M in, $${m.costPerMillionOutput}/M out`);
    });

    console.log("\nEvaluator Model:");
    if (resolved.evaluatorModel) {
      console.log(`  ${resolved.evaluatorModel.shortName}`);
      console.log(`     ID: ${resolved.evaluatorModel.id}`);
      console.log(`     Provider: ${resolved.evaluatorModel.provider}`);
    } else {
      console.log("  (none suitable)");
    }
  } catch (error: any) {
    console.log(`\n  ERROR: ${error.message}`);
  }

  console.log("\n");
}

async function main() {
  try {
    console.log("Fetching OpenRouter catalog...\n");
    const models = await fetchOpenRouterModels();

    console.log(`Loaded ${models.length} models from OpenRouter\n`);

    // Filter stats
    const textFocused = models.filter(m => {
      const outputs = m.architecture?.output_modalities || [];
      return outputs.includes("text") && !outputs.some(o => ["image", "audio", "video"].includes(o));
    });
    console.log(`Text-focused models: ${textFocused.length}\n`);

    // Debug: show top scoring models for balanced
    debugTopModels("balanced", models);

    // Test each preset
    const presetIds: PresetId[] = ["casual", "balanced", "research", "coding", "creative"];

    for (const presetId of presetIds) {
      printPresetResults(presetId, models);
    }

  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main();
