"use client";

import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import Link from "next/link";

interface ProcessSectionProps {
  maxRounds: number;
  setMaxRounds: (value: number) => void;
  consensusThreshold: number;
  setConsensusThreshold: (value: number) => void;
  enableSearch: boolean;
  setEnableSearch: (value: boolean) => void;
  hasTavilyKey: boolean;
  disabled?: boolean;
}

export function ProcessSection({
  maxRounds,
  setMaxRounds,
  consensusThreshold,
  setConsensusThreshold,
  enableSearch,
  setEnableSearch,
  hasTavilyKey,
  disabled = false,
}: ProcessSectionProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
        Process
      </h3>
      <div className="p-3 border rounded-lg space-y-3">
        {/* Rounds and Threshold in a row on larger screens */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_1px_1fr] gap-4">
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
          </div>

          {/* Vertical divider - only visible on md+ */}
          <div className="hidden md:block bg-border" />

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
          </div>
        </div>

        {/* Web Search Toggle */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-0.5">
            <Label htmlFor="enable-search">Enable Web Search</Label>
            <p className="text-xs text-muted-foreground">
              {hasTavilyKey ? (
                "Provides models with current web information"
              ) : (
                <>
                  <Link href="/settings" className="underline">
                    Add Tavily API key
                  </Link>{" "}
                  to enable
                </>
              )}
            </p>
          </div>
          <Switch
            id="enable-search"
            checked={enableSearch}
            onCheckedChange={setEnableSearch}
            disabled={disabled || !hasTavilyKey}
          />
        </div>
      </div>
    </div>
  );
}
