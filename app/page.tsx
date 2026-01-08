import { auth } from "@/lib/auth";
import { Hero } from "@/components/landing/hero";
import { ProblemSolution } from "@/components/landing/problem-solution";
import { HowItWorks } from "@/components/landing/how-it-works";
import { Features } from "@/components/landing/features";
import { FinalCTA } from "@/components/landing/final-cta";
import { SectionNav } from "@/components/landing/section-nav";
import { ScrollTracker } from "@/components/landing/scroll-tracker";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();
  const isSignedIn = !!session;

  return (
    <main className="flex min-h-screen flex-col">
      <ScrollTracker />
      <SectionNav />
      <Hero isSignedIn={isSignedIn} />
      <ProblemSolution />
      <HowItWorks />
      <Features />
      <FinalCTA isSignedIn={isSignedIn} />
    </main>
  );
}
