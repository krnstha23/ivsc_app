import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { authConfig } from '@/lib/auth.config'

/**
 * Edge-safe auth instance (no Prisma or other Node-only deps).
 * Use this in proxy.ts so it can run in the Edge runtime.
 * Credentials provider here never runs in middleware; it's only to satisfy NextAuthConfig type.
 */
export const { auth } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      credentials: { username: {}, password: {} },
      authorize: () => null,
    }),
  ],
})
