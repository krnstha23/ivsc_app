import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

/**
 * Edge-compatible auth config (no Node-only APIs like Prisma).
 * Used by middleware and merged into the full auth config in auth.ts.
 */
export const authConfig = {
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/login',
  },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as { role?: string }).role
        token.username = (user as { username?: string }).username
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string
        ;(session.user as { role?: string }).role = token.role as string
        ;(session.user as { username?: string }).username = token.username as string
      }
      return session
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl
      const isProtectedRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/users') ||
        pathname.startsWith('/packages') ||
        pathname.startsWith('/calendar') ||
        pathname.startsWith('/students') ||
        pathname.startsWith('/teachers')

      if (isProtectedRoute && !auth?.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      return true
    },
  },
} satisfies Omit<NextAuthConfig, 'providers'>
