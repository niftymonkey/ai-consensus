import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { UserMenu } from "@/components/auth/user-menu";
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
    <html lang="en">
      <body className="antialiased">
        <Providers session={session}>
          <div className="min-h-screen flex flex-col">
            <header className="border-b border-gray-200 bg-white">
              <div className="container mx-auto px-4 py-4 flex items-center justify-between">
                <Link href="/">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-claude via-gpt to-gemini-end bg-clip-text text-transparent cursor-pointer">
                    AI Consensus
                  </h1>
                </Link>
                <UserMenu />
              </div>
            </header>
            <main className="flex-1">
              {children}
            </main>
            <footer className="border-t border-gray-200 bg-white py-4">
              <div className="container mx-auto px-4 text-center text-sm text-gray-500">
                Powered by Claude, GPT, and Gemini
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
