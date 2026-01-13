"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";
import posthog from "posthog-js";

interface PreviewUpgradeCtaProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
  /** Source for analytics tracking */
  source?: "banner" | "exhausted_card" | "no_keys_alert";
}

export function PreviewUpgradeCta({
  variant = "default",
  size = "sm",
  className,
  source = "banner",
}: PreviewUpgradeCtaProps) {
  const handleClick = () => {
    posthog.capture("preview_upgrade_cta_clicked", { source });
  };

  return (
    <Button variant={variant} size={size} className={className} asChild onClick={handleClick}>
      <Link href="/settings">
        <Key className="h-4 w-4 mr-1.5" />
        Add API Key
      </Link>
    </Button>
  );
}
