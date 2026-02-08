import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import { verifyPassword } from '@/lib/passwords'
import { authConfig } from '@/lib/auth.config'

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: {
    strategy: 'jwt',
  },
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username as string | undefined
        const password = credentials?.password as string | undefined

        if (!username || !password) {
          return null
        }

        const user = await prisma.user.findUnique({
          where: { username: username.trim() },
        })

        if (!user || !user.passwordHash) {
          return null
        }

        if (!user.isActive) {
          return null
        }

        const valid = await verifyPassword(password, user.passwordHash)
        if (!valid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: [user.firstName, user.middleName, user.lastName]
            .filter(Boolean)
            .join(' ')
            .trim(),
          role: user.role,
          image: null,
        }
      },
    }),
  ],
})
