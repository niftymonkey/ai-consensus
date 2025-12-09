import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI Consensus - Multi-Model Collaboration",
  description: "Ask a question and watch Claude, GPT, and Gemini collaborate to reach consensus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-200 bg-white">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-claude via-gpt to-gemini-end bg-clip-text text-transparent">
                AI Consensus
              </h1>
              <div className="text-sm text-gray-500">
                {/* User menu will go here */}
              </div>
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
      </body>
    </html>
  );
}
