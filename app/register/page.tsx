import Link from "next/link"
import { GalleryVerticalEnd } from "lucide-react"

export default function RegisterPage() {
  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          IVCS
        </Link>
        <div className="rounded-lg border bg-card p-6 text-center shadow-sm">
          <h1 className="text-xl font-semibold">Create an account</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Registration form and server action coming next.
          </p>
          <Link
            href="/login"
            className="mt-4 inline-block text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  )
}
