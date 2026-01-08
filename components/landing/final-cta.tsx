"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight, Github } from "lucide-react";
import posthog from "posthog-js";

interface FinalCTAProps {
  isSignedIn: boolean;
}

export function FinalCTA({ isSignedIn }: FinalCTAProps) {
  const handleCtaClick = () => {
    posthog.capture("final_cta_clicked", {
      is_signed_in: isSignedIn,
    });
  };

  const handleGitHubClick = () => {
    posthog.capture("github_link_clicked", {
      source: "final_cta",
    });
  };

  return (
    <section id="cta" className="relative px-4 py-12 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] opacity-20 dark:opacity-10 bg-gradient-to-t from-primary/60 via-primary/20 to-transparent blur-3xl" />
      </div>

      <div className="mx-auto max-w-3xl text-center">
        {/* Main message */}
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
          Ready for answers you can{" "}
          <span className="whitespace-nowrap"><span className="text-primary">feel confident</span> about?</span>
        </h2>

        <p className="mt-6 text-lg sm:text-xl text-muted-foreground max-w-xl mx-auto">
          Start a consensus with your own API keys. It takes less than a minute to set up.
        </p>

        {/* CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
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
            variant="outline"
            size="lg"
            className="h-12 px-8 text-base gap-2"
            asChild
            onClick={handleGitHubClick}
          >
            <a
              href="https://github.com/niftymonkey/ai-consensus"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Github className="h-4 w-4" />
              View on GitHub
            </a>
          </Button>
        </div>

        {/* Setup steps */}
        <div className="mt-12 pt-12 border-t border-border/50">
          <p className="text-sm text-muted-foreground mb-6">Quick setup in 3 steps:</p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-4 text-sm">
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">1</span>
              <span>Sign in</span>
            </div>
            <span className="hidden sm:block text-muted-foreground/50">→</span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">2</span>
              <span>Add API key</span>
            </div>
            <span className="hidden sm:block text-muted-foreground/50">→</span>
            <div className="flex items-center gap-2 whitespace-nowrap">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium shrink-0">3</span>
              <span>Ask a question</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
