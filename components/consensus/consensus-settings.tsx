"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface ConsensusSettingsProps {
  maxRounds: number;
  setMaxRounds: (value: number) => void;
  consensusThreshold: number;
  setConsensusThreshold: (value: number) => void;
  disabled?: boolean;
}

export function ConsensusSettings({
  maxRounds,
  setMaxRounds,
  consensusThreshold,
  setConsensusThreshold,
  disabled = false,
}: ConsensusSettingsProps) {
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
            step={5}
            value={[consensusThreshold]}
            onValueChange={([value]) => setConsensusThreshold(value)}
            disabled={disabled}
            className="w-full"
          />
          <p className="text-xs text-muted-foreground">
            Consensus score must reach {consensusThreshold}% to stop early
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
