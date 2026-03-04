"use client"

import { useTheme } from "next-themes"
import { Moon, Sun2 } from "@solar-icons/react"
import { Button } from "@/components/ui/button"

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme()

  function toggle() {
    setTheme(resolvedTheme === "dark" ? "light" : "dark")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-8"
      onClick={toggle}
      aria-label={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {resolvedTheme === "dark" ? (
        <Sun2 size={16} className="size-4" />
      ) : (
        <Moon size={16} className="size-4" />
      )}
    </Button>
  )
}
