import { cache } from "react";
import NextAuth from "next-auth";
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { Role } from "@/app/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/passwords";
import { authConfig } from "@/lib/auth.config";

/** Thrown from credentials authorize; `code` is returned to the client when `signIn(..., { redirect: false })`. */
class TeacherNotApprovedError extends CredentialsSignin {
    constructor() {
        super();
        this.code = "teacher_not_approved";
    }
}

const TOKEN_USER_RECHECK_MS = 5 * 60 * 1000;

const nextAuth = NextAuth({
    ...authConfig,
    session: {
        strategy: "jwt",
    },
    callbacks: {
        ...authConfig.callbacks,
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { role?: string }).role;
                token.username = (user as { username?: string }).username;
                (token as { lastUserCheckAt?: number }).lastUserCheckAt = Date.now();
                return token;
            }

            const userId = token.id as string | undefined;
            if (!userId) return token;

            const now = Date.now();
            const lastUserCheckAt = (token as { lastUserCheckAt?: number })
                .lastUserCheckAt;
            const hasFreshTokenData =
                typeof token.role === "string" &&
                typeof token.username === "string" &&
                typeof lastUserCheckAt === "number" &&
                now - lastUserCheckAt < TOKEN_USER_RECHECK_MS;
            if (hasFreshTokenData) {
                return token;
            }

            const dbUser = await prisma.user.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    userName: true,
                    role: true,
                    isActive: true,
                    teacherProfile: { select: { isApproved: true } },
                },
            });

            if (!dbUser || !dbUser.isActive) {
                token.id = undefined;
                token.role = undefined;
                token.username = undefined;
                (token as { lastUserCheckAt?: number }).lastUserCheckAt =
                    undefined;
                return token;
            }

            if (
                dbUser.role === Role.TEACHER &&
                !dbUser.teacherProfile?.isApproved
            ) {
                token.id = undefined;
                token.role = undefined;
                token.username = undefined;
                (token as { lastUserCheckAt?: number }).lastUserCheckAt =
                    undefined;
                return token;
            }

            token.role = dbUser.role;
            token.username = dbUser.userName;
            (token as { lastUserCheckAt?: number }).lastUserCheckAt = now;
            return token;
        },
        session({ session, token }) {
            if (!session.user) return session;

            const userId = token.id as string | undefined;
            if (!userId) return { ...session, user: undefined };

            (session.user as { id?: string }).id = userId;
            (session.user as { role?: string }).role = token.role as string;
            (session.user as { username?: string }).username =
                token.username as string;
            return session;
        },
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
                        teacherProfile: { select: { isApproved: true } },
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

                if (user.role === Role.TEACHER) {
                    if (
                        !user.teacherProfile ||
                        !user.teacherProfile.isApproved
                    ) {
                        throw new TeacherNotApprovedError();
                    }
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
export const auth = cache(async () => {
    const session = await nextAuth.auth();
    const userId = (session?.user as { id?: string } | undefined)?.id;
    if (!userId) return null;
    return session;
});

export const { handlers, signIn, signOut } = nextAuth;
