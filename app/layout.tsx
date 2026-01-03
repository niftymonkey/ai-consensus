import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { auth } from "@/lib/auth";
import { Toaster } from "@/components/ui/sonner";

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
      <body className="antialiased min-h-screen bg-background">
        <Providers session={session}>
          {children}
        </Providers>
        <Toaster richColors />
      </body>
    </html>
  );
}
