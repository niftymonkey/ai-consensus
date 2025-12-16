import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function BenefitCards() {
  return (
    <div className="grid w-full gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
      <Card className="rounded-lg border bg-card p-5 text-center text-card-foreground sm:p-6">
        <div className="mb-2 text-2xl sm:mb-3 sm:text-3xl">🎯</div>
        <CardTitle className="mb-1.5 text-base sm:mb-2 sm:text-lg">More Accurate</CardTitle>
        <CardDescription className="text-sm">
          Multiple perspectives reduce blind spots and bias
        </CardDescription>
      </Card>

      <Card className="rounded-lg border bg-card p-5 text-center text-card-foreground sm:p-6">
        <div className="mb-2 text-2xl sm:mb-3 sm:text-3xl">🔍</div>
        <CardTitle className="mb-1.5 text-base sm:mb-2 sm:text-lg">See The Debate</CardTitle>
        <CardDescription className="text-sm">
          Watch models challenge each other&apos;s reasoning
        </CardDescription>
      </Card>

      <Card className="rounded-lg border bg-card p-5 text-center text-card-foreground sm:p-6">
        <div className="mb-2 text-2xl sm:mb-3 sm:text-3xl">💪</div>
        <CardTitle className="mb-1.5 text-base sm:mb-2 sm:text-lg">Higher Confidence</CardTitle>
        <CardDescription className="text-sm">
          When models agree, you can feel a little more confident in the answer
        </CardDescription>
      </Card>
    </div>
  );
}
