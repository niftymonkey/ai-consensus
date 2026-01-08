import { cn } from "@/lib/utils";
import { MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";

export function ProblemSolution() {
  return (
    <section id="problem-solution" className="px-4 py-12 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
          {/* Problem */}
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              The Problem
            </p>

            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Different AI models give{" "}
              <span className="text-muted-foreground">different answers</span>
            </h2>

            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              Ask three AI models the same question and you&apos;ll get three
              different responses. Each has its own training, biases, and blind spots.
              So which answer do you trust?
            </p>

            {/* Visual representation of the problem */}
            <div className="mt-8 space-y-3">
              {[
                { model: "Model A", answer: "The answer is definitely X..." },
                { model: "Model B", answer: "Actually, I believe it's Y..." },
                { model: "Model C", answer: "Consider option Z instead..." },
              ].map((item, i) => (
                <div
                  key={item.model}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border bg-card text-left",
                    "opacity-70"
                  )}
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <MessageSquare className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{item.model}</p>
                    <p className="text-sm text-muted-foreground">{item.answer}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Solution */}
          <div className="text-center lg:text-left">
            <p className="text-sm font-medium text-primary uppercase tracking-wider">
              The Solution
            </p>

            <h2 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight">
              Make them{" "}
              <span className="text-primary">work together</span>
            </h2>

            <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
              AI Consensus orchestrates a collaborative deliberation. Models see each
              other&apos;s responses, refine their reasoning, and work toward
              a more aligned answer.
            </p>

            {/* Visual representation of the solution */}
            <div className="mt-8 space-y-4">
              <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4">
                <div className="flex -space-x-2">
                  {["A", "B", "C"].map((letter, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center text-xs font-medium text-primary"
                    >
                      {letter}
                    </div>
                  ))}
                </div>
                <ArrowRight className="h-5 w-5 text-muted-foreground rotate-90 sm:rotate-0" />
                <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">Unified Consensus</span>
                </div>
              </div>

              <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 text-left">
                <p className="text-sm font-medium mb-2">The consensus:</p>
                <p className="text-sm text-muted-foreground">
                  &quot;After considering multiple perspectives, the most accurate answer
                  is X, with important nuances from Y that address edge cases...&quot;
                </p>
              </div>

              <ul className="space-y-2 text-left">
                {[
                  "See where models agree and disagree",
                  "Watch reasoning evolve across rounds",
                  "Get transparent evaluation metrics",
                ].map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm">
                    <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
