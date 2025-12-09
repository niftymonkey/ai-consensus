import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AIModelCards() {
  return (
    <div className="grid gap-6 py-8 md:grid-cols-3">
      <Card>
        <CardHeader>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <div className="h-6 w-6 rounded-full bg-primary"></div>
          </div>
          <CardTitle>Claude</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Choose from Haiku, Sonnet, or Opus models with your own Anthropic API key
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
            Select from GPT-4, GPT-5, or o1 models using your OpenAI API key
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
            Pick from Gemini 1.5, 2.0, or 2.5 models with your Google API key
          </CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
