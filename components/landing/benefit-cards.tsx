import { Card, CardDescription, CardTitle } from "@/components/ui/card";
import { HelpCircle, MessagesSquare, Target } from "lucide-react";

export function BenefitCards() {
  return (
    <div className="grid w-full gap-4 sm:gap-6 md:grid-cols-3 lg:gap-8">
      <Card className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
        <div className="text-center space-y-3 sm:space-y-4">
          <HelpCircle className="mx-auto h-8 w-8 text-primary sm:h-10 sm:w-10" />
          <CardTitle className="text-base sm:text-lg">Ask Your Question</CardTitle>
          <CardDescription className="text-sm">
            Submit any question and get multiple AI perspectives working together to find the answer
          </CardDescription>
        </div>
      </Card>

      <Card className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
        <div className="text-center space-y-3 sm:space-y-4">
          <MessagesSquare className="mx-auto h-8 w-8 text-primary sm:h-10 sm:w-10" />
          <CardTitle className="text-base sm:text-lg">Watch The Debate</CardTitle>
          <CardDescription className="text-sm">
            See AI models deliberate in real-time, challenging each other&apos;s reasoning and refining their responses
          </CardDescription>
        </div>
      </Card>

      <Card className="rounded-lg border bg-card p-5 text-card-foreground sm:p-6">
        <div className="text-center space-y-3 sm:space-y-4">
          <Target className="mx-auto h-8 w-8 text-primary sm:h-10 sm:w-10" />
          <CardTitle className="text-base sm:text-lg">The Consensus Process</CardTitle>
          <CardDescription className="text-sm">
            Track perspectives shifting across rounds, revealing both agreement and disagreement
          </CardDescription>
        </div>
      </Card>
    </div>
  );
}
