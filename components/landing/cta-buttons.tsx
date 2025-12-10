import Link from "next/link";
import { Button } from "@/components/ui/button";

export function CTAButtons() {
  return (
    <div className="flex justify-center gap-4">
      <Button size="lg" asChild>
        <Link href="/consensus">Get Started</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/chat">Simple Chat</Link>
      </Button>
      <Button size="lg" variant="outline" asChild>
        <Link href="/settings">Settings</Link>
      </Button>
    </div>
  );
}
