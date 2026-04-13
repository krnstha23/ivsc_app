"use client"

import Link from "next/link"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"
import { UserRounded, Moon, Sun2, Logout2 } from "@solar-icons/react"
import { useLogoutConfirm } from "@/components/logout-confirm-context"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function HeaderUserMenu() {
  const { data: session } = useSession()
  const { setTheme, resolvedTheme } = useTheme()
  const { openLogoutConfirm } = useLogoutConfirm()

  const sessionUser = session?.user as
    | { name?: string; email?: string; image?: string; username?: string }
    | undefined
  const username = sessionUser?.username ?? ""
  const name = sessionUser?.name ?? sessionUser?.email ?? "User"
  const email = sessionUser?.email ?? ""
  const avatar = sessionUser?.image ?? ""

  /** Abbreviation for avatar fallback: prefer username (e.g. "ab" from "admin"), else name/email. */
  const avatarFallback = username
    ? username.slice(0, 2).toUpperCase()
    : (name || email).slice(0, 2).toUpperCase() || "?"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8 rounded-full">
          <Avatar className="size-8">
            <AvatarImage src={avatar} alt={name} />
            <AvatarFallback className="rounded-full text-xs">
              {avatarFallback}
            </AvatarFallback>
          </Avatar>
          <span className="sr-only">User menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-2 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={avatar} alt={name} />
              <AvatarFallback className="rounded-lg text-xs">
                {avatarFallback}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{username || name}</span>
              <span className="truncate text-xs text-muted-foreground">
                {email}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href="/profile" className="cursor-pointer">
              <UserRounded size={16} className="size-4" />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? (
              <Sun2 size={16} className="size-4" />
            ) : (
              <Moon size={16} className="size-4" />
            )}
            {resolvedTheme === "dark" ? "Light mode" : "Dark mode"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={openLogoutConfirm}>
          <Logout2 size={16} className="size-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
