import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

/**
 * Edge-compatible auth config (no Node-only APIs like Prisma).
 * Used by middleware and merged into the full auth config in auth.ts.
 */
export const authConfig = {
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
      }
      return session
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isDashboardRoute =
        pathname.startsWith('/admin') ||
        pathname.startsWith('/teacher') ||
        pathname.startsWith('/student')

      if (isDashboardRoute && !auth?.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      return true
    },
  },
} satisfies NextAuthConfig
