import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { UnifiedModel } from "@/lib/models";

interface ModelInfoTooltipProps {
  model: UnifiedModel;
  children: React.ReactNode;
}

export function ModelInfoTooltip({ model, children }: ModelInfoTooltipProps) {
  // Don't show tooltip if no metadata available
  if (!model.description && !model.contextWindow && !model.speed && !model.costTier) {
    return <>{children}</>;
  }

  return (
    <Tooltip delayDuration={200}>
      <TooltipTrigger asChild>
        {children}
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-sm p-3">
        <div className="space-y-2">
          <p className="font-semibold text-sm">{model.name}</p>
          {model.description && (
            <p className="text-xs text-muted-foreground">{model.description}</p>
          )}

          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs pt-1">
            {model.contextWindow && (
              <div>
                <span className="font-medium">Context:</span>{" "}
                <span className="text-muted-foreground">
                  {formatContextWindow(model.contextWindow)}
                </span>
              </div>
            )}
            {model.speed && (
              <div>
                <span className="font-medium">Speed:</span>{" "}
                <span className="text-muted-foreground">
                  {capitalizeFirst(model.speed)}
                </span>
              </div>
            )}
            {model.costTier && (
              <div>
                <span className="font-medium">Cost:</span>{" "}
                <span className="text-muted-foreground">
                  {capitalizeFirst(model.costTier)}
                </span>
              </div>
            )}
            {model.modality && (
              <div className="col-span-2">
                <span className="font-medium">Modality:</span>{" "}
                <span className="text-muted-foreground">
                  {model.modality}
                </span>
              </div>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function formatContextWindow(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1).replace('.0', '')}M tokens`;
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(0)}K tokens`;
  }
  return `${tokens} tokens`;
}

function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
