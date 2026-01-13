"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Key, ArrowRight } from "lucide-react";
import Link from "next/link";
import posthog from "posthog-js";

export function PreviewExhaustedCard() {
  const handleCtaClick = () => {
    posthog.capture("preview_upgrade_cta_clicked", { source: "exhausted_card" });
  };

  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Sparkles className="h-6 w-6 text-accent-foreground" />
        </div>
        <CardTitle className="text-xl">Ready for More?</CardTitle>
        <CardDescription className="text-base">
          You&apos;ve used all 3 preview runs. Add your own API key to continue using AI Consensus with unlimited access.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-lg border border-border bg-muted/50 p-4 space-y-3">
          <h4 className="font-medium flex items-center gap-2">
            <Key className="h-4 w-4" />
            With your own API key, you get:
          </h4>
          <ul className="text-sm text-muted-foreground space-y-2 ml-6">
            <li>Unlimited consensus runs</li>
            <li>Use any model from OpenAI, Anthropic, Google & more</li>
            <li>All presets including Research and Creative modes</li>
            <li>Web search integration</li>
          </ul>
        </div>
        <Button asChild className="w-full" size="lg" onClick={handleCtaClick}>
          <Link href="/settings">
            Configure API Keys
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          Your keys are encrypted and stored locally in your browser.
        </p>
      </CardContent>
    </Card>
  );
}
