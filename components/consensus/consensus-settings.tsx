"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectSeparator, SelectLabel, SelectGroup } from "@/components/ui/select";
import type { ProviderModels } from "@/lib/models";

interface ConsensusSettingsProps {
  maxRounds: number;
  setMaxRounds: (value: number) => void;
  consensusThreshold: number;
  setConsensusThreshold: (value: number) => void;
  evaluatorModel: string;
  setEvaluatorModel: (value: string) => void;
  availableModels: ProviderModels | null;
  disabled?: boolean;
}

export function ConsensusSettings({
  maxRounds,
  setMaxRounds,
  consensusThreshold,
  setConsensusThreshold,
  evaluatorModel,
  setEvaluatorModel,
  availableModels,
  disabled = false,
}: ConsensusSettingsProps) {
  // Filter out nano/mini/lite models - keep only evaluation-suitable models
  // Use word boundaries to avoid matching "Gemini" when filtering "mini"
  const evaluatorModels = availableModels ? [
    ...availableModels.anthropic.filter(m => {
      const lower = m.name.toLowerCase();
      return !lower.includes('nano') &&
             !lower.includes(' mini') &&
             !lower.includes('-mini') &&
             !lower.includes('lite');
    }),
    ...availableModels.openai.filter(m => {
      const lower = m.name.toLowerCase();
      return !lower.includes('nano') &&
             !lower.includes(' mini') &&
             !lower.includes('-mini') &&
             !lower.includes('lite');
    }),
    ...availableModels.google.filter(m => {
      const lower = m.name.toLowerCase();
      return !lower.includes('nano') &&
             !lower.includes(' mini') &&
             !lower.includes('-mini') &&
             !lower.includes('lite');
    }),
  ] : [];

  // Separate recommended from other models and sort alphabetically
  const recommendedModels = evaluatorModels.filter(m => m.recommended).sort((a, b) => a.name.localeCompare(b.name));
  const otherModels = evaluatorModels.filter(m => !m.recommended).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Card>
        <CardHeader>
          <CardTitle>Consensus Settings</CardTitle>
          <CardDescription>
            Configure how models will refine their responses
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Rounds */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="max-rounds">Maximum Rounds</Label>
              <span className="text-sm font-medium">{maxRounds}</span>
            </div>
            <Slider
              id="max-rounds"
              min={1}
              max={10}
              step={1}
              value={[maxRounds]}
              onValueChange={([value]) => setMaxRounds(value)}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Models will refine their responses up to {maxRounds} time{maxRounds > 1 ? "s" : ""}
            </p>
          </div>

          {/* Consensus Threshold */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="consensus-threshold">Consensus Threshold</Label>
              <span className="text-sm font-medium">{consensusThreshold}%</span>
            </div>
            <Slider
              id="consensus-threshold"
              min={60}
              max={95}
              step={1}
              value={[consensusThreshold]}
              onValueChange={([value]) => setConsensusThreshold(value)}
              disabled={disabled}
              className="w-full"
            />
            <p className="text-xs text-muted-foreground">
              Consensus score must reach {consensusThreshold}% to stop early
            </p>
          </div>

          {/* Evaluator Model */}
          <div className="space-y-2">
            <Label htmlFor="evaluator-model">Evaluator Model</Label>
            <Select
              value={evaluatorModel}
              onValueChange={setEvaluatorModel}
              disabled={disabled || evaluatorModels.length === 0}
            >
              <SelectTrigger id="evaluator-model">
                <SelectValue placeholder="Select evaluator model" />
              </SelectTrigger>
              <SelectContent>
                {/* Recommended models */}
                {recommendedModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Recommended</SelectLabel>
                    {recommendedModels.map((model) => {
                      const isFree = model.pricing?.input === 0 && model.pricing?.output === 0;
                      const pricingText = isFree
                        ? 'Free ⭐'
                        : model.pricing
                          ? `$${model.pricing.input}/$${model.pricing.output} per 1M`
                          : null;

                      const metaParts = [
                        model.speed ? model.speed.charAt(0).toUpperCase() + model.speed.slice(1) : null,
                        model.costTier ? model.costTier.charAt(0).toUpperCase() + model.costTier.slice(1) : null,
                        model.contextWindow ? `${model.contextWindow >= 1000000 ? (model.contextWindow / 1000000).toFixed(1).replace('.0', '') + 'M' : (model.contextWindow / 1000).toFixed(0) + 'K'} context` : null,
                        pricingText,
                      ].filter(Boolean).join(' • ');

                      return (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="pl-6"
                          description={model.description}
                          metadata={metaParts}
                        >
                          {model.name}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                )}

                {/* Other models */}
                {otherModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel>Other Models</SelectLabel>
                    {otherModels.map((model) => {
                      const isFree = model.pricing?.input === 0 && model.pricing?.output === 0;
                      const pricingText = isFree
                        ? 'Free ⭐'
                        : model.pricing
                          ? `$${model.pricing.input}/$${model.pricing.output} per 1M`
                          : null;

                      const metaParts = [
                        model.speed ? model.speed.charAt(0).toUpperCase() + model.speed.slice(1) : null,
                        model.costTier ? model.costTier.charAt(0).toUpperCase() + model.costTier.slice(1) : null,
                        model.contextWindow ? `${model.contextWindow >= 1000000 ? (model.contextWindow / 1000000).toFixed(1).replace('.0', '') + 'M' : (model.contextWindow / 1000).toFixed(0) + 'K'} context` : null,
                        pricingText,
                      ].filter(Boolean).join(' • ');

                      return (
                        <SelectItem
                          key={model.id}
                          value={model.id}
                          className="pl-6"
                          description={model.description}
                          metadata={metaParts}
                        >
                          {model.name}
                        </SelectItem>
                      );
                    })}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              This model evaluates consensus and synthesizes the final response
            </p>
          </div>
        </CardContent>
      </Card>
  );
}
