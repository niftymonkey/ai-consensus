import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const session = await auth()

  // Protect /consensus and /settings routes
  if (!session && (request.nextUrl.pathname.startsWith('/consensus') || request.nextUrl.pathname.startsWith('/settings'))) {
    const signInUrl = new URL('/api/auth/signin', request.url)
    signInUrl.searchParams.set('callbackUrl', request.url)
    return NextResponse.redirect(signInUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/consensus/:path*', '/settings/:path*']
}
