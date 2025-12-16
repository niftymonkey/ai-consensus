import { Button } from "@/components/ui/button";
import { ArrowDown, ArrowDownCircle } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AutoScrollToggleProps {
  enabled: boolean;
  onToggle: () => void;
  onResume?: () => void;
  isUserScrolling?: boolean;
  show?: boolean;
}

/**
 * Floating toggle button for auto-scroll preference.
 * Shows at bottom-right when content is being generated.
 */
export function AutoScrollToggle({
  enabled,
  onToggle,
  onResume,
  isUserScrolling = false,
  show = true,
}: AutoScrollToggleProps) {
  if (!show) return null;

  const handleClick = () => {
    if (!enabled) {
      // Re-enabling: call resume which enables + scrolls to current content
      onResume?.();
    } else {
      // Disabling: just toggle off
      onToggle();
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={enabled ? "default" : "outline"}
              size="icon"
              onClick={handleClick}
              className="h-12 w-12 rounded-full shadow-lg transition-all hover:scale-110"
            >
              {enabled ? (
                <ArrowDownCircle className="h-6 w-6" />
              ) : (
                <ArrowDown className="h-6 w-6" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="font-medium">
              {enabled ? "Auto-scroll enabled" : "Auto-scroll disabled"}
            </p>
            <p className="text-xs text-muted-foreground">
              {enabled
                ? "Following new content automatically"
                : "Click to resume and scroll to current content"}
            </p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
