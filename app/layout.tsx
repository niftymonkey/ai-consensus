import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/auth/user-menu";
import { ThemeSelector } from "@/components/theme-selector";
import Link from "next/link";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "AI Consensus - Multi-Model Collaboration",
  description: "Ask a question and watch Claude, GPT, and Gemini collaborate to reach consensus",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('color-theme') || 'claude';
                  if (theme !== 'claude') {
                    document.documentElement.setAttribute('data-theme', theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Oxanium:wght@400;600;700&family=Montserrat:wght@400;600;700&family=DM+Sans:wght@400;600;700&family=Inter:wght@400;600;700&family=Merriweather:wght@400;700&family=Source+Code+Pro:wght@400;600&family=Space+Mono:wght@400;700&family=JetBrains+Mono:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body className="antialiased">
        <Providers session={session}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b bg-background">
              <div className="container flex h-16 items-center justify-between">
                <Link href="/" className="text-2xl font-bold">
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
            <footer className="border-t bg-card py-4">
              <div className="container text-center text-sm text-muted-foreground">
                Powered by Claude, GPT, and Gemini
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
