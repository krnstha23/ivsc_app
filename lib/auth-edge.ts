import NextAuth from 'next-auth'
import { authConfig } from '@/lib/auth.config'

/**
 * Edge-safe auth instance (no Prisma or other Node-only deps).
 * Use this in middleware.ts so it can run in the Edge runtime.
 */
export const { auth } = NextAuth({
  ...authConfig,
  session: { strategy: 'jwt' },
})
