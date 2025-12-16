import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AIModelCards() {
  return (
    <div>
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
              <div className="h-6 w-6 rounded-full bg-primary"></div>
            </div>
            <CardTitle>Claude</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Anthropic
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary/10">
              <div className="h-6 w-6 rounded-full bg-secondary"></div>
            </div>
            <CardTitle>GPT</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              OpenAI
            </CardDescription>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
              <div className="h-6 w-6 rounded-full bg-accent"></div>
            </div>
            <CardTitle>Gemini</CardTitle>
          </CardHeader>
          <CardContent>
            <CardDescription>
              Google
            </CardDescription>
          </CardContent>
        </Card>
      </div>
      <p className="text-sm text-muted-foreground mt-4 text-center">
        Configure your API keys in <Link href="/settings" className="underline hover:text-foreground">Settings</Link>
      </p>
    </div>
  );
}
