"use client";

import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "@/components/theme-provider";
import { PostHogIdentify } from "@/components/posthog-identify";
import { ReactNode } from "react";
import { Session } from "next-auth";

export function Providers({
  children,
  session
}: {
  children: ReactNode;
  session: Session | null;
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <PostHogIdentify />
        {children}
      </ThemeProvider>
    </SessionProvider>
  );
}
