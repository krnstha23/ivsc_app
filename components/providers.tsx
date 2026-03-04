"use client"

import type { Session } from "next-auth"
import { ThemeProvider } from "next-themes"
import { SessionProvider } from "next-auth/react"

export function Providers({
  children,
  session,
}: {
  children: React.ReactNode
  session?: Session | null
}) {
  return (
    <SessionProvider session={session}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        {children}
      </ThemeProvider>
    </SessionProvider>
  )
}
