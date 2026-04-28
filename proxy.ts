import { NextResponse } from 'next/server'
import type { NextFetchEvent, NextRequest, NextMiddleware } from 'next/server'
import { auth } from '@/lib/auth-edge'

const authMiddleware = auth as NextMiddleware

export default function proxy(request: NextRequest, event: NextFetchEvent) {
  const p = request.nextUrl.pathname
  if (p === '/pricing' || p === '/pricing/') {
    return NextResponse.redirect(new URL('/#pricing', request.url))
  }
  return authMiddleware(request, event)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
