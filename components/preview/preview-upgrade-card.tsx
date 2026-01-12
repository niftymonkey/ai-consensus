"use client";

import { usePreviewStatus } from "@/hooks/use-preview-status";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PreviewBadge } from "./preview-badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap, Infinity, Layers, Search } from "lucide-react";

interface BenefitItemProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function BenefitItem({ icon, title, description }: BenefitItemProps) {
  return (
    <div className="flex items-start gap-3">
      <div className="shrink-0 p-2 rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  );
}

const BENEFITS = [
  {
    icon: <Infinity className="h-4 w-4" />,
    title: "Unlimited runs",
    description: "No limits on evaluations",
  },
  {
    icon: <Zap className="h-4 w-4" />,
    title: "All models",
    description: "Access to GPT-4o, Claude Opus, and more",
  },
  {
    icon: <Layers className="h-4 w-4" />,
    title: "More participants",
    description: "Up to 3 models per evaluation",
  },
  {
    icon: <Search className="h-4 w-4" />,
    title: "Web search",
    description: "Enable real-time web search",
  },
];

interface PreviewUpgradeCardProps {
  hasKeys?: boolean;
}

/**
 * Shows upgrade messaging for preview users on the settings page.
 * Only renders for users in preview mode who haven't configured API keys yet.
 */
export function PreviewUpgradeCard({ hasKeys = false }: PreviewUpgradeCardProps) {
  const { status, isLoading } = usePreviewStatus();

  // Don't show anything while loading - prevents flash
  if (isLoading) {
    return null;
  }

  // Not in preview mode - don't show upgrade card
  if (!status?.enabled) {
    return null;
  }

  // User has configured API keys - don't show upgrade card
  if (hasKeys) {
    return null;
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Bring Your Own Key</CardTitle>
          <PreviewBadge
            runsRemaining={status.runsRemaining}
            totalAllowed={status.totalAllowed}
          />
        </div>
        <CardDescription>
          Add your API key below for full access
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          {BENEFITS.map((benefit) => (
            <BenefitItem
              key={benefit.title}
              icon={benefit.icon}
              title={benefit.title}
              description={benefit.description}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
