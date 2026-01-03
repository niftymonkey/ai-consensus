"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { OpenRouterModelWithMeta } from "@/lib/openrouter-models";
import { formatProviderName } from "@/lib/openrouter-models";

interface ModelComboboxProps {
  models: OpenRouterModelWithMeta[];
  groupedModels: Record<string, OpenRouterModelWithMeta[]>;
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  /** Model IDs to show in a "Recommended" section at the top */
  recommendedIds?: string[];
}

/**
 * Infer cost tier from price per million tokens
 */
function getCostTier(
  costPerMillion: number
): "Free" | "Budget" | "Standard" | "Premium" {
  if (costPerMillion === 0) return "Free";
  if (costPerMillion < 1) return "Budget";
  if (costPerMillion < 10) return "Standard";
  return "Premium";
}

/**
 * Format context length for display
 */
function formatContext(contextLength: number): string {
  if (contextLength >= 1000000) {
    return `${(contextLength / 1000000).toFixed(1)}M`;
  }
  return `${(contextLength / 1000).toFixed(0)}K`;
}

// Context for passing selection handler without prop drilling
const SelectionContext = React.createContext<{
  selectedId: string;
  onSelect: (id: string) => void;
} | null>(null);

// Pre-computed display data to avoid recalculating in render
interface ModelDisplayData {
  id: string;
  shortName: string;
  description: string;
  costTier: "Free" | "Budget" | "Standard" | "Premium";
  isFree: boolean;
  contextDisplay: string;
  priceDisplay: string;
  searchValue: string;
}

function computeDisplayData(model: OpenRouterModelWithMeta): ModelDisplayData {
  const isFree = model.isFree;
  return {
    id: model.id,
    shortName: model.shortName,
    description: model.description || "",
    costTier: getCostTier(model.costPerMillionInput),
    isFree,
    contextDisplay: formatContext(model.context_length),
    priceDisplay: isFree
      ? ""
      : `$${model.costPerMillionInput.toFixed(2)}/$${model.costPerMillionOutput.toFixed(2)}`,
    searchValue: `${model.name} ${model.id}`,
  };
}

// Memoized model item that uses context for selection
const ModelItem = React.memo(function ModelItem({
  data,
}: {
  data: ModelDisplayData;
}) {
  const ctx = React.useContext(SelectionContext);
  if (!ctx) return null;

  const isSelected = ctx.selectedId === data.id;

  const rowContent = (
    <>
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <Check
          className={cn(
            "h-4 w-4 shrink-0",
            isSelected ? "opacity-100" : "opacity-0"
          )}
        />
        <span className="font-medium truncate">{data.shortName}</span>
      </div>
      <div className="text-xs shrink-0 ml-2 flex items-center gap-1">
        {data.isFree ? (
          <span className="text-green-600 dark:text-green-400 font-medium">
            Free
          </span>
        ) : (
          <span>{data.costTier}</span>
        )}
        <span className="opacity-50">•</span>
        <span>{data.contextDisplay}</span>
        {!data.isFree && (
          <>
            <span className="opacity-50">•</span>
            <span>{data.priceDisplay}</span>
          </>
        )}
      </div>
    </>
  );

  return (
    <CommandItem
      value={data.searchValue}
      onSelect={() => ctx.onSelect(data.id)}
      className="flex items-center justify-between py-1.5 cursor-pointer"
    >
      {data.description ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-between w-full">
              {rowContent}
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="max-w-xs">
            <p className="text-sm">{data.description}</p>
          </TooltipContent>
        </Tooltip>
      ) : (
        rowContent
      )}
    </CommandItem>
  );
});

// Memoized group of models
const ModelGroup = React.memo(function ModelGroup({
  heading,
  models,
}: {
  heading: string;
  models: ModelDisplayData[];
}) {
  if (models.length === 0) return null;

  return (
    <CommandGroup heading={heading}>
      {models.map((data) => (
        <ModelItem key={data.id} data={data} />
      ))}
    </CommandGroup>
  );
});


export function ModelCombobox({
  models,
  groupedModels,
  value,
  onValueChange,
  placeholder = "Select model...",
  disabled = false,
  isLoading = false,
  className,
  recommendedIds,
}: ModelComboboxProps) {
  const [open, setOpen] = React.useState(false);

  // Stable callback for selection
  const handleSelect = React.useCallback(
    (modelId: string) => {
      onValueChange(modelId);
      setOpen(false);
    },
    [onValueChange]
  );

  // Context value - only changes when value or handleSelect changes
  const contextValue = React.useMemo(
    () => ({ selectedId: value, onSelect: handleSelect }),
    [value, handleSelect]
  );

  // Pre-compute all display data (expensive, but only when models change)
  const displayDataMap = React.useMemo(() => {
    const map = new Map<string, ModelDisplayData>();
    for (const model of models) {
      map.set(model.id, computeDisplayData(model));
    }
    return map;
  }, [models]);

  // Find the selected model for display
  const selectedModel = React.useMemo(
    () => models.find((m) => m.id === value),
    [models, value]
  );

  // Pre-compute recommended models display data
  const recommendedDisplayData = React.useMemo(() => {
    if (!recommendedIds || recommendedIds.length === 0) return [];
    return recommendedIds
      .map((id) => displayDataMap.get(id))
      .filter((d): d is ModelDisplayData => d !== undefined);
  }, [recommendedIds, displayDataMap]);

  // Set of recommended IDs for filtering
  const recommendedIdSet = React.useMemo(
    () => new Set(recommendedIds || []),
    [recommendedIds]
  );

  // Pre-compute sorted providers with their filtered models
  const providerGroups = React.useMemo(() => {
    const priority = [
      "anthropic",
      "openai",
      "google",
      "meta-llama",
      "mistralai",
      "deepseek",
      "cohere",
    ];

    const providers = Object.keys(groupedModels).sort((a, b) => {
      const aIndex = priority.indexOf(a);
      const bIndex = priority.indexOf(b);
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.localeCompare(b);
    });

    return providers.map((provider) => {
      const providerModels = groupedModels[provider] || [];
      const filteredModels =
        recommendedDisplayData.length > 0
          ? providerModels.filter((m) => !recommendedIdSet.has(m.id))
          : providerModels;

      return {
        provider,
        heading: formatProviderName(provider),
        models: filteredModels
          .map((m) => displayDataMap.get(m.id))
          .filter((d): d is ModelDisplayData => d !== undefined),
      };
    });
  }, [groupedModels, recommendedIdSet, recommendedDisplayData.length, displayDataMap]);

  if (isLoading) {
    return (
      <Button
        variant="outline"
        className={cn("w-full justify-between", className)}
        disabled
      >
        <span className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading models...
        </span>
      </Button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
          disabled={disabled}
        >
          {selectedModel ? (
            <span className="flex items-center gap-2 truncate">
              <span className="truncate">{selectedModel.shortName}</span>
              <span className="text-xs text-muted-foreground">
                {formatProviderName(selectedModel.provider)}
              </span>
            </span>
          ) : (
            placeholder
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[500px] p-0" align="start">
        <SelectionContext.Provider value={contextValue}>
          <TooltipProvider delayDuration={300}>
            <Command>
              <CommandInput placeholder="Search models..." />
              <CommandList className="max-h-[400px]">
                <CommandEmpty>No model found.</CommandEmpty>

                {/* Recommended section */}
                {recommendedDisplayData.length > 0 && (
                  <ModelGroup heading="Recommended" models={recommendedDisplayData} />
                )}

                {/* All provider groups */}
                {providerGroups.map(({ provider, heading, models: groupModels }) => (
                  <ModelGroup key={provider} heading={heading} models={groupModels} />
                ))}
              </CommandList>
            </Command>
          </TooltipProvider>
        </SelectionContext.Provider>
      </PopoverContent>
    </Popover>
  );
}
