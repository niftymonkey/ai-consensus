import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;

  // Protected routes
  const protectedRoutes = ["/api/chat", "/api/keys", "/settings"];
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isProtectedRoute && !isLoggedIn) {
    // Redirect to custom sign-in page
    const loginUrl = new URL("/signin", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const response = NextResponse.next();

  // Add CSP headers for production
  const cspHeader = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline';
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' blob: data: https://lh3.googleusercontent.com https://cdn.discordapp.com;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://generativelanguage.googleapis.com https://api.openai.com https://api.anthropic.com;
    object-src 'none';
    base-uri 'self';
    form-action 'self' https://accounts.google.com https://discord.com;
    frame-ancestors 'none';
    upgrade-insecure-requests;
  `.replace(/\s{2,}/g, ' ').trim();

  response.headers.set('Content-Security-Policy', cspHeader);

  return response;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
