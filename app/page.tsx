import { auth } from "@/lib/auth";
import { Hero } from "@/components/landing/hero";
import { BenefitCards } from "@/components/landing/benefit-cards";
import { CTAButtons } from "@/components/landing/cta-buttons";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 sm:py-12 lg:py-16">
        <div className="w-full max-w-5xl text-center">
          <Hero />

          <div className="mt-6 sm:mt-8">
            <BenefitCards />
          </div>

          <div className="mt-8 sm:mt-12 lg:mt-16">
            <CTAButtons isSignedIn={!!session} />
          </div>
        </div>
      </div>
    </main>
  );
}
