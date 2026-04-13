import Link from "next/link";

export function LandingHeader() {
    return (
        <header className="absolute inset-x-0 top-0 z-50">
            <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 pt-6 sm:px-6 lg:pt-8">
                <Link
                    href="/"
                    className="text-sm font-semibold tracking-tight text-white sm:text-base"
                >
                    ScoreMirror
                </Link>

                <div className="flex items-center gap-5">
                    <Link
                        href="/login"
                        className="text-sm font-medium text-white/90 transition-colors hover:text-white"
                    >
                        Log in
                    </Link>
                    <Link
                        href="/register"
                        className="rounded-xl bg-[#7C5CFF] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#7C5CFF]/25 transition hover:bg-[#6d4ee6]"
                    >
                        Get Started
                    </Link>
                </div>
            </div>
        </header>
    );
}
