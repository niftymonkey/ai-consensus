import Link from "next/link";
import { Button } from "@/components/ui/button";

interface CTAButtonsProps {
  isSignedIn: boolean;
}

export function CTAButtons({ isSignedIn }: CTAButtonsProps) {
  return (
    <div className="flex justify-center">
      <Button size="lg" asChild>
        <Link href="/consensus">Get Started</Link>
      </Button>
    </div>
  );
}
