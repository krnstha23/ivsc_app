"use client"

import {
  createContext,
  useCallback,
  useContext,
  useState,
} from "react"
import { signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

type LogoutConfirmContextValue = {
  openLogoutConfirm: () => void
}

const LogoutConfirmContext = createContext<LogoutConfirmContextValue | null>(
  null
)

export function useLogoutConfirm() {
  const ctx = useContext(LogoutConfirmContext)
  if (!ctx) {
    throw new Error("useLogoutConfirm must be used within LogoutConfirmProvider")
  }
  return ctx
}

export function LogoutConfirmProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)

  const openLogoutConfirm = useCallback(() => {
    setOpen(true)
  }, [])

  const handleLogout = useCallback(async () => {
    setOpen(false)
    await signOut({ redirect: false })
    router.push("/login")
    router.refresh()
  }, [router])

  return (
    <LogoutConfirmContext.Provider value={{ openLogoutConfirm }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Log out</DialogTitle>
            <DialogDescription>
              Do you want to log out? You will be returned to the login page.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleLogout}>Logout</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </LogoutConfirmContext.Provider>
  )
}
