"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Key } from "lucide-react";

interface TrialUpgradeCtaProps {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg";
  className?: string;
}

export function TrialUpgradeCta({
  variant = "default",
  size = "sm",
  className,
}: TrialUpgradeCtaProps) {
  return (
    <Button variant={variant} size={size} className={className} asChild>
      <Link href="/settings">
        <Key className="h-4 w-4 mr-1.5" />
        Add API Key
      </Link>
    </Button>
  );
}
