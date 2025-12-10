import { auth } from "@/lib/auth";
import { Hero } from "@/components/landing/hero";
import { AIModelCards } from "@/components/landing/ai-model-cards";
import { DevelopmentProgress } from "@/components/landing/development-progress";
import { CTAButtons } from "@/components/landing/cta-buttons";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();

  return (
    <div className="container py-12">
      <div className="space-y-8 text-center">
        <Hero />
        {session && <CTAButtons />}
        <AIModelCards />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-start-2">
            <DevelopmentProgress />
          </div>
        </div>
      </div>
    </div>
  );
}
