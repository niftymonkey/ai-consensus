import Link from "next/link";
import { ThemeSelector } from "@/components/theme-selector";
import { UserMenu } from "@/components/auth/user-menu";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center justify-between">
          <Link href="/consensus" className="text-2xl font-bold">
            AI Consensus
          </Link>
          <div className="flex items-center gap-4">
            <ThemeSelector />
            <UserMenu />
          </div>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
