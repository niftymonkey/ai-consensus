import { cn } from "@/lib/utils";
import {
  MessageCircleQuestion,
  MessagesSquare,
  Scale,
  RefreshCw,
  CheckCircle2,
} from "lucide-react";

const steps = [
  {
    number: "01",
    title: "Ask your question",
    description: "Enter any question you want answered. Complex decisions, technical problems, creative challenges — anything.",
    icon: MessageCircleQuestion,
  },
  {
    number: "02",
    title: "Models respond",
    description: "Your selected AI models respond simultaneously with their initial answers. Choose from 200+ models via OpenRouter.",
    icon: MessagesSquare,
  },
  {
    number: "03",
    title: "Evaluate alignment",
    description: "An evaluator model analyzes all responses, identifying points of agreement, disagreement, and areas needing clarification.",
    icon: Scale,
  },
  {
    number: "04",
    title: "Refine together",
    description: "Models see each other's responses and the evaluation. They refine their answers, addressing gaps and working toward alignment.",
    icon: RefreshCw,
  },
  {
    number: "05",
    title: "Get your answer",
    description: "Once alignment threshold is met (or max rounds reached), you get a unified answer with full transparency into how it was derived.",
    icon: CheckCircle2,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="px-4 py-12">
      <div className="mx-auto max-w-5xl">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16 lg:mb-20">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary uppercase tracking-wider mb-4">
            <span className="w-8 h-px bg-primary/50" />
            How It Works
            <span className="w-8 h-px bg-primary/50" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            From question to consensus
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            A transparent, iterative process that surfaces the best answer
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connecting line (desktop) */}
          <div className="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-border via-primary/30 to-border" />

          <div className="space-y-8 lg:space-y-0">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isEven = index % 2 === 0;

              return (
                <div
                  key={step.number}
                  className={cn(
                    "relative lg:grid lg:grid-cols-2 lg:gap-12",
                    index !== steps.length - 1 && "lg:pb-16"
                  )}
                >
                  {/* Desktop layout: alternating sides */}
                  <div
                    className={cn(
                      "lg:text-right",
                      !isEven && "lg:order-2 lg:text-left"
                    )}
                  >
                    <div
                      className={cn(
                        "inline-flex flex-col",
                        isEven ? "lg:items-end" : "lg:items-start"
                      )}
                    >
                      {/* Step number - large, desktop only */}
                      <span className="hidden lg:block text-5xl font-bold text-primary/20 mb-2">
                        {step.number}
                      </span>

                      {/* Content card */}
                      <div className="p-5 rounded-xl border bg-card shadow-sm max-w-md">
                        <div className={cn(
                          "flex items-center gap-3 mb-3",
                          isEven ? "lg:flex-row-reverse" : ""
                        )}>
                          {/* Icon with step number badge - icon hidden on desktop (shown in timeline node) */}
                          <div className="relative">
                            <div className="p-2 rounded-lg bg-primary/10 lg:hidden">
                              <Icon className="h-5 w-5 text-primary" />
                            </div>
                            {/* Step number badge - mobile only */}
                            <span className="lg:hidden absolute -top-1 -right-1 flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                              {step.number.replace('0', '')}
                            </span>
                          </div>
                          <h3 className="text-lg font-semibold">{step.title}</h3>
                        </div>
                        <p className={cn(
                          "text-sm text-muted-foreground leading-relaxed",
                          isEven ? "lg:text-right" : "lg:text-left"
                        )}>
                          {step.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Center node (desktop) */}
                  <div
                    className={cn(
                      "hidden lg:flex absolute left-1/2 -translate-x-1/2 items-center justify-center",
                      "w-10 h-10 rounded-full bg-background border-2 border-primary shadow-lg shadow-primary/20"
                    )}
                    style={{ top: "2rem" }}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                  </div>

                  {/* Empty column for alternating layout */}
                  <div className={cn("hidden lg:block", !isEven && "lg:order-1")} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
