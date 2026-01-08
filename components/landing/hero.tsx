"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import posthog from "posthog-js";

interface HeroProps {
  isSignedIn: boolean;
}

export function Hero({ isSignedIn }: HeroProps) {
  const handleCtaClick = () => {
    posthog.capture("hero_cta_clicked", {
      is_signed_in: isSignedIn,
    });
  };

  const handleHowItWorksClick = () => {
    posthog.capture("how_it_works_clicked", {
      source: "hero",
    });
  };

  return (
    <section id="hero" className="relative min-h-[100dvh] flex items-center justify-center px-4 py-16">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] opacity-30 dark:opacity-20 bg-gradient-to-br from-primary/40 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-4xl text-center">
        {/* Main headline */}
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl xl:text-7xl animate-in fade-in slide-in-from-bottom-3 duration-500">
          <span className="block">Stop choosing between</span>
          <span className="block mt-1 sm:mt-2">
            <span className="relative inline-block">
              <span className="relative z-10 text-primary">conflicting</span>
              <span className="absolute bottom-1 left-0 right-0 h-3 bg-primary/20 -z-0 rounded-sm" />
            </span>
            {" "}answers
          </span>
        </h1>

        {/* Subheadline */}
        <p className="mt-6 sm:mt-8 text-lg sm:text-xl lg:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          AI Consensus makes multiple AI models work together on your questions,
          refining their reasoning across multiple rounds. One answer. Multiple perspectives.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-5 duration-500 delay-200">
          <Button
            size="lg"
            className="h-12 px-8 text-base font-medium gap-2 shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
            asChild
            onClick={handleCtaClick}
          >
            <Link href="/consensus">
              Start a Consensus
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="lg"
            className="h-12 px-8 text-base text-muted-foreground hover:text-foreground"
            asChild
            onClick={handleHowItWorksClick}
          >
            <Link href="#how-it-works">
              See how it works
            </Link>
          </Button>
        </div>

        {/* Trust indicator */}
        <p className="mt-8 text-sm text-muted-foreground/70 animate-in fade-in duration-500 delay-300">
          200+ models via OpenRouter &middot; Bring your own keys &middot; Open source
        </p>
      </div>
    </section>
  );
}
