import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Key, ArrowRight } from "lucide-react";

export function NoKeysAlert() {
  return (
    <Card className="mx-auto max-w-xl">
      <CardHeader className="text-center pb-2">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent">
          <Key className="h-6 w-6 text-accent-foreground" />
        </div>
        <CardTitle className="text-xl">Bring Your Own Key</CardTitle>
        <CardDescription className="text-base">
          Add your API key to start using AI Consensus with multiple models working together.
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
        <Button asChild className="w-full" size="lg">
          <Link href="/settings">
            Configure API Keys
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <p className="text-xs text-center text-muted-foreground">
          We recommend OpenRouter - one key for 200+ models.
        </p>
      </CardContent>
    </Card>
  );
}
