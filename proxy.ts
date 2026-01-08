import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { auth } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect /consensus and /settings routes
  const session = await auth();
  if (
    !session &&
    (pathname.startsWith("/consensus") || pathname.startsWith("/settings"))
  ) {
    const signInUrl = new URL("/api/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", request.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/consensus/:path*", "/settings/:path*"],
};
