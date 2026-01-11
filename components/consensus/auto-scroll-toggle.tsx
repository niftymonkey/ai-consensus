import { useState, useEffect, useRef } from "react";
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
  const [isPulsing, setIsPulsing] = useState(false);
  const prevEnabledRef = useRef(enabled);

  // Pulse animation when auto-scroll transitions from ON to OFF
  useEffect(() => {
    if (prevEnabledRef.current && !enabled) {
      setIsPulsing(true);
      const timer = setTimeout(() => setIsPulsing(false), 1000);
      return () => clearTimeout(timer);
    }
    prevEnabledRef.current = enabled;
  }, [enabled]);

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
              onClick={handleClick}
              className={`h-12 rounded-full shadow-lg transition-all hover:scale-105 flex items-center gap-2 px-4 ${
                isPulsing ? "animate-pulse ring-2 ring-amber-500 ring-offset-2" : ""
              }`}
            >
              {enabled ? (
                <ArrowDownCircle className="h-5 w-5" />
              ) : (
                <ArrowDown className="h-5 w-5" />
              )}
              <span className="text-sm font-medium">
                Auto-scroll {enabled ? "ON" : "OFF"}
              </span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left" className="max-w-xs">
            <p className="text-xs">
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
