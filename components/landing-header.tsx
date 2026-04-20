import Link from "next/link";

const navLinkClass =
    "text-sm font-medium text-white/85 transition-colors hover:text-white";

export function LandingHeader() {
    return (
        <header className="absolute inset-x-0 top-0 z-50">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:pt-8">
                <Link
                    href="/"
                    className="shrink-0 text-sm font-semibold tracking-tight text-white sm:text-base"
                >
                    ScoreMirror
                </Link>

                <nav
                    className="mx-4 hidden min-w-0 flex-1 items-center justify-center gap-5 lg:gap-8 md:flex"
                    aria-label="Primary"
                >
                    <Link href="/" className={navLinkClass}>
                        Home
                    </Link>
                    <Link href="/#features" className={navLinkClass}>
                        Features
                    </Link>
                    <Link href="/#experience" className={navLinkClass}>
                        Experience
                    </Link>
                    <Link href="/#pricing" className={navLinkClass}>
                        Pricing
                    </Link>
                    <Link href="/packages" className={navLinkClass}>
                        Packages
                    </Link>
                </nav>

                <div className="flex shrink-0 items-center gap-3 sm:gap-5">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-white/90 transition-colors hover:text-white"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-xl bg-[#7C5CFF] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C5CFF]/25 transition hover:bg-[#6d4ee6] sm:px-5"
                    >
                        Get Started
                    </Link>
                </div>
            </div>
        </header>
    );
}
