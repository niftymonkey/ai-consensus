import { Card, CardContent } from "@/components/ui/card";

export function HowItWorks() {
  return (
    <div className="w-full">
      <div className="grid gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
        <Card className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="text-3xl font-bold text-primary sm:text-4xl">1</div>
            <h4 className="font-semibold text-base sm:text-lg">Ask Your Question</h4>
            <p className="text-sm text-muted-foreground">
              Submit any question or topic you want to explore
            </p>
          </div>
        </Card>

        <Card className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="text-3xl font-bold text-primary sm:text-4xl">2</div>
            <h4 className="font-semibold text-base sm:text-lg">Models Deliberate</h4>
            <p className="text-sm text-muted-foreground">
              Watch AI models discuss and refine their responses
            </p>
          </div>
        </Card>

        <Card className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="text-3xl font-bold text-primary sm:text-4xl">3</div>
            <h4 className="font-semibold text-base sm:text-lg">See Consensus + Individual Views</h4>
            <p className="text-sm text-muted-foreground">
              Review the unified answer and each model&apos;s perspective
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
