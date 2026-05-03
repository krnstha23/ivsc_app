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
      const userId = token.id as string | undefined
      if (!session.user || !userId) {
        return { ...session, user: undefined }
      }
      (session.user as { id?: string }).id = userId
      ;(session.user as { role?: string }).role = token.role as string
      ;(session.user as { username?: string }).username = token.username as string
      return session
    },
    authorized({ auth, request }) {
      const { pathname } = request.nextUrl

      if (pathname.startsWith('/calendar')) {
        if (!auth?.user) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
        if ((auth.user as { role?: string }).role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return true
      }

      if (pathname.startsWith('/packages') && !auth?.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      const isPackagesAdminRoute =
        pathname === '/packages' ||
        pathname === '/packages/' ||
        pathname === '/packages/new' ||
        pathname === '/packages/bundles/new' ||
        /^\/packages\/bundles\/[^/]+\/edit$/.test(pathname) ||
        /^\/packages\/[^/]+\/edit$/.test(pathname)
      if (isPackagesAdminRoute) {
        if (!auth?.user) {
          return NextResponse.redirect(new URL('/login', request.url))
        }
        if ((auth.user as { role?: string }).role !== 'ADMIN') {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
        return true
      }

      const isProtectedRoute =
        pathname.startsWith('/dashboard') ||
        pathname.startsWith('/users') ||
        pathname.startsWith('/students') ||
        pathname.startsWith('/teachers') ||
        pathname.startsWith('/profile') ||
        pathname.startsWith('/sessions')

      if (isProtectedRoute && !auth?.user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      return true
    },
  },
} satisfies Omit<NextAuthConfig, 'providers'>
