"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  const evaluatorModels = availableModels ? [
    ...availableModels.anthropic.filter(m =>
      !m.name.toLowerCase().includes('nano') &&
      !m.name.toLowerCase().includes('mini') &&
      !m.name.toLowerCase().includes('lite')
    ),
    ...availableModels.openai.filter(m =>
      !m.name.toLowerCase().includes('nano') &&
      !m.name.toLowerCase().includes('mini') &&
      !m.name.toLowerCase().includes('lite')
    ),
    ...availableModels.google.filter(m =>
      !m.name.toLowerCase().includes('nano') &&
      !m.name.toLowerCase().includes('mini') &&
      !m.name.toLowerCase().includes('lite')
    ),
  ] : [];
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
              {evaluatorModels.map((model) => (
                <SelectItem key={model.id} value={model.id}>
                  {model.name}
                </SelectItem>
              ))}
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
