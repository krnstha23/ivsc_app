"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useLogoutConfirm } from "@/components/logout-confirm-context"

const DASHBOARD_BACK_STATE = "ivcs-dashboard-back"

/**
 * When the user presses the browser back button on the dashboard, show the
 * shared "Do you want to log out?" dialog instead of navigating away.
 */
export function BackButtonLogoutHandler() {
  const pathname = usePathname()
  const { openLogoutConfirm } = useLogoutConfirm()

  const isAppRoute =
    (pathname?.startsWith("/dashboard") ||
      pathname?.startsWith("/users") ||
      pathname?.startsWith("/packages")) ??
    false

  useEffect(() => {
    if (!isAppRoute || typeof window === "undefined") return

    function pushState() {
      window.history.pushState(
        { [DASHBOARD_BACK_STATE]: true },
        "",
        window.location.pathname + window.location.search
      )
    }

    function onPopState() {
      openLogoutConfirm()
      pushState()
    }

    pushState()
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [isAppRoute, openLogoutConfirm])

  return null
}
