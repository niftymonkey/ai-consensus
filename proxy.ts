import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /settings route (requires auth to save API keys)
  // Note: /consensus is NOT protected - allows unauthenticated preview mode access
  const session = await auth();
  if (!session && pathname.startsWith("/settings")) {
    const signInUrl = new URL("/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/settings/:path*"],
};
