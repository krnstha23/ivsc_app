"use client"

import CheckedIcon from "@/components/ui/checked-icon"
import InfoCircleIcon from "@/components/ui/info-circle-icon"
import RefreshIcon from "@/components/ui/refresh-icon"
import XIcon from "@/components/ui/x-icon"
import TriangleAlertIcon from "@/components/ui/triangle-alert-icon"
import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CheckedIcon size={16} className="size-4" />,
        info: <InfoCircleIcon size={16} className="size-4" />,
        warning: <TriangleAlertIcon size={16} className="size-4" />,
        error: <XIcon size={16} className="size-4" />,
        loading: <RefreshIcon size={16} className="size-4 animate-spin" />,
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
