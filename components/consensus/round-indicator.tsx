"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";

interface RoundIndicatorProps {
  currentRound: number;
  maxRounds: number;
  rounds: Array<{
    roundNumber: number;
    consensusScore: number;
  }>;
  isSynthesizing?: boolean;
}

export function RoundIndicator({
  currentRound,
  maxRounds,
  rounds,
  isSynthesizing = false,
}: RoundIndicatorProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Progress</h3>
            <span className="text-sm text-muted-foreground">
              Round {currentRound} of {maxRounds}
            </span>
          </div>

          {/* Timeline */}
          <div className="flex items-center justify-between gap-2">
            {Array.from({ length: maxRounds }, (_, i) => {
              const roundNumber = i + 1;
              const isCompleted = rounds.some((r) => r.roundNumber === roundNumber);
              const isCurrent = !isSynthesizing && currentRound === roundNumber;
              const roundData = rounds.find((r) => r.roundNumber === roundNumber);

              return (
                <div key={roundNumber} className="flex flex-col items-center flex-1">
                  {/* Round Circle */}
                  <div className="relative">
                    {isCompleted ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : isCurrent ? (
                      <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    ) : (
                      <Circle className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Round Number */}
                  <span className="text-xs mt-1 font-medium">
                    R{roundNumber}
                  </span>

                  {/* Consensus Score Badge */}
                  {roundData && (
                    <Badge
                      variant={roundData.consensusScore >= 80 ? "default" : "secondary"}
                      className="mt-1 text-xs"
                    >
                      {roundData.consensusScore}%
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full transition-all duration-300"
              style={{ width: `${(currentRound / maxRounds) * 100}%` }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
