"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Loader2, Minus } from "lucide-react";

interface RoundIndicatorProps {
  currentRound: number;
  maxRounds: number;
  rounds: Array<{
    roundNumber: number;
    consensusScore: number;
  }>;
  isSynthesizing?: boolean;
  isProcessing?: boolean;
  consensusThreshold: number;
}

export function RoundIndicator({
  currentRound,
  maxRounds,
  rounds,
  isSynthesizing = false,
  isProcessing = false,
  consensusThreshold,
}: RoundIndicatorProps) {
  // Calculate progress based on completed rounds
  const completedRounds = rounds.length;
  const isComplete = !isProcessing && completedRounds > 0;
  const progressPercent = completedRounds > 0 ? (completedRounds / maxRounds) * 100 : 0;

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
              const isCompleted =
                roundNumber < currentRound ||
                rounds.some((r) => r.roundNumber === roundNumber) ||
                (isSynthesizing && roundNumber <= currentRound);
              const isCurrent = !isSynthesizing && currentRound === roundNumber && isProcessing;
              // A round is skipped if we're done processing and it's beyond the current round
              const isSkipped = !isProcessing && roundNumber > currentRound;
              const roundData = rounds.find((r) => r.roundNumber === roundNumber);

              return (
                <div key={roundNumber} className="flex flex-col items-center flex-1">
                  {/* Round Circle */}
                  <div className="relative">
                    {isCompleted ? (
                      <CheckCircle2 className="h-8 w-8 text-green-500" />
                    ) : isCurrent ? (
                      <Loader2 className="h-8 w-8 text-yellow-500 animate-spin" />
                    ) : isSkipped ? (
                      <div className="h-8 w-8 rounded-full border-2 border-muted-foreground flex items-center justify-center">
                        <Minus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    ) : (
                      <Circle className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>

                  {/* Round Number */}
                  <span className="text-xs mt-1 font-medium">
                    R{roundNumber}
                  </span>

                  {/* Consensus Score Badge - Always reserve space */}
                  <div className="mt-1 h-5">
                    {roundData && (
                      <Badge
                        variant="default"
                        className={`text-xs text-white ${
                          roundData.consensusScore >= consensusThreshold
                            ? "bg-green-500 hover:bg-green-600"
                            : "bg-red-500 hover:bg-red-600"
                        }`}
                      >
                        {roundData.consensusScore}%
                      </Badge>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Progress Bar - Segmented by round */}
          <div className="w-full bg-secondary h-2 rounded-full overflow-hidden flex">
            {Array.from({ length: maxRounds }, (_, i) => {
              const roundNumber = i + 1;
              const roundData = rounds.find((r) => r.roundNumber === roundNumber);
              const segmentWidth = `${100 / maxRounds}%`;

              // Determine segment color
              let segmentColor = "bg-gray-300"; // Default: not yet run/skipped
              if (roundData) {
                // Round completed - check if it met threshold
                segmentColor = roundData.consensusScore >= consensusThreshold
                  ? "bg-green-500"
                  : "bg-red-500";
              }

              return (
                <div
                  key={roundNumber}
                  className={`h-full transition-all duration-300 ${segmentColor}`}
                  style={{ width: segmentWidth }}
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
