import { cache } from "react";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { authConfig } from "@/lib/auth.config";

const nextAuth = NextAuth({
    ...authConfig,
    session: {
        strategy: "jwt",
    },
    providers: [
        Credentials({
            credentials: {
                username: { label: "Username", type: "text" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const username = credentials?.username as string | undefined;
                const password = credentials?.password as string | undefined;

                if (!username || !password) {
                    return null;
                }

                const user = await prisma.user.findUnique({
                    where: { userName: username.trim() },
                    select: {
                        id: true,
                        userName: true,
                        email: true,
                        firstName: true,
                        middleName: true,
                        lastName: true,
                        passwordHash: true,
                        isActive: true,
                        role: true,
                    },
                });

                if (!user || !user.passwordHash) {
                    return null;
                }

                if (!user.isActive) {
                    return null;
                }

                const valid = await verifyPassword(password, user.passwordHash);
                if (!valid) {
                    return null;
                }

                return {
                    id: user.id,
                    username: user.userName,
                    email: user.email,
                    name: [user.firstName, user.middleName, user.lastName]
                        .filter(Boolean)
                        .join(" ")
                        .trim(),
                    role: user.role,
                    image: null,
                };
            },
        }),
    ],
});

/** Cached auth: multiple calls in the same request (layout + pages) only run once. */
export const auth = cache(nextAuth.auth);

export const { handlers, signIn, signOut } = nextAuth;
