import {
  Layers,
  Settings2,
  Zap,
  Key,
  Scale,
  Code2,
  Eye,
  Globe,
} from "lucide-react";

const features = [
  {
    icon: Layers,
    title: "200+ Models",
    description: "Access Claude, GPT, Gemini, Llama, Mistral, and more through OpenRouter with a single API key.",
  },
  {
    icon: Eye,
    title: "Full Transparency",
    description: "See agreements, disagreements, and reasoning evolution. Understand exactly how the models aligned.",
  },
  {
    icon: Scale,
    title: "Choose Your Evaluator",
    description: "Pick which AI model judges the responses and identifies where they agree or disagree.",
  },
  {
    icon: Zap,
    title: "Real-time Streaming",
    description: "Watch responses stream in as models think. See the deliberation happen live, not just the final result.",
  },
  {
    icon: Settings2,
    title: "Configurable Rounds",
    description: "Set consensus thresholds and max rounds. Control how deeply models deliberate.",
  },
  {
    icon: Key,
    title: "Bring Your Own Keys",
    description: "Your API keys, your costs. Keys are encrypted with AES-256 and never leave your control.",
  },
  {
    icon: Globe,
    title: "Works Anywhere",
    description: "Browser-based and fully responsive. Use it on desktop, tablet, or mobile.",
  },
  {
    icon: Code2,
    title: "Self-Hostable",
    description: "Run your own instance with full control. Open source under AGPL-3.0.",
  },
];

export function Features() {
  return (
    <section id="features" className="px-4 py-12 bg-muted/30">
      <div className="mx-auto max-w-6xl">
        {/* Section header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-sm font-medium text-primary uppercase tracking-wider mb-4">
            <span className="w-8 h-px bg-primary/50" />
            Features
            <span className="w-8 h-px bg-primary/50" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">
            Everything you need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful features with a focus on transparency and control
          </p>
        </div>

        {/* Features grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <div
                key={feature.title}
                className="group relative p-5 rounded-xl border bg-card transition-all duration-300 hover:shadow-lg hover:shadow-primary/5 hover:border-primary/30"
              >
                {/* Title with inline icon */}
                <h3 className="flex items-center gap-1.5 text-lg font-semibold mb-2">
                  <Icon className="h-4 w-4 text-primary shrink-0" />
                  {feature.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>

                {/* Subtle corner accent on hover */}
                <div className="absolute top-0 right-0 w-16 h-16 overflow-hidden rounded-tr-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute top-0 right-0 w-24 h-24 -translate-y-1/2 translate-x-1/2 bg-gradient-to-bl from-primary/10 to-transparent rounded-full" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
