"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import posthog from "posthog-js";

interface CTAButtonsProps {
  isSignedIn: boolean;
}

export function CTAButtons({ isSignedIn }: CTAButtonsProps) {
  const handleClick = () => {
    // Track get started clicked (top of funnel)
    posthog.capture("get_started_clicked", {
      is_signed_in: isSignedIn,
    });
  };

  return (
    <div className="flex justify-center">
      <Button size="lg" asChild onClick={handleClick}>
        <Link href="/consensus">Get Started</Link>
      </Button>
    </div>
  );
}
