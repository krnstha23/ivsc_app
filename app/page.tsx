import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProgressBarsSection } from "@/components/progress-bars-section";

/* Inline icons to avoid SSR createContext with @solar-icons on root route */
function LogoIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
        </svg>
    );
}
function DocIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
    );
}
function MonitorIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
        </svg>
    );
}
function ChartIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M3 3v18h18" />
            <path d="M7 16v-5M12 16V8M17 16v-3" />
        </svg>
    );
}
function CalendarIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <rect x="3" y="4" width="18" height="18" rx="2" />
            <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
    );
}
function PackageIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M12 3v18M3 9l9-6 9 6-9 6-9-6z" />
            <path d="M21 9v6M3 15v-6" />
        </svg>
    );
}
function CheckIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <path d="m9 11 3 3L22 4" />
        </svg>
    );
}
function HeadphonesIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M3 18v-6a9 9 0 0 1 18 0v6" />
            <path d="M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z" />
        </svg>
    );
}
function BookIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
    );
}
function MicIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2M12 19v3" />
        </svg>
    );
}
function PencilIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className={className}
            aria-hidden
        >
            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
        </svg>
    );
}
function HomeIcon({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden
        >
            <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <path d="M9 22V12h6v10" />
        </svg>
    );
}

export default function HomePage() {
    return (
        <div className="flex min-h-svh flex-col bg-background">
            {/* Header – logo left, nav center, CTA right */}
            <header className="border-border sticky top-0 z-10 border-b bg-background">
                <div className="container mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
                    <Link
                        href="/"
                        className="flex shrink-0 items-center gap-2 font-semibold text-foreground"
                    >
                        <span className="bg-primary text-primary-foreground flex size-8 items-center justify-center rounded-md">
                            <LogoIcon className="size-4.5" />
                        </span>
                        IVCS
                    </Link>
                    <nav className="hidden items-center gap-6 md:flex">
                        <Link
                            href="/packages"
                            className="text-muted-foreground hover:text-foreground text-sm font-medium"
                        >
                            Packages
                        </Link>
                        <Link
                            href="/calendar"
                            className="text-muted-foreground hover:text-foreground text-sm font-medium"
                        >
                            Calendar
                        </Link>
                        <Link
                            href="/login"
                            className="text-muted-foreground hover:text-foreground text-sm font-medium"
                        >
                            Login
                        </Link>
                    </nav>
                    <div className="flex shrink-0 items-center gap-2">
                        <ThemeToggle />
                        <Link
                            href="/register"
                            className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-medium"
                        >
                            Get started
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1">
                {/* Hero – two columns: copy left, image right; stacks on small screens */}
                <section className="bg-muted/30 px-4 py-12 sm:px-6 sm:py-16 md:py-20">
                    <div className="container mx-auto grid max-w-6xl items-center gap-8 md:grid-cols-2 md:gap-12">
                        <div className="min-w-0">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                                Take your mock tests online. Book practice
                                sessions in one place.
                            </h1>
                            <p className="text-muted-foreground mt-4 max-w-xl text-base sm:text-lg">
                                Teachers set availability. Students pick
                                packages and book real-time sessions—all from
                                home. One platform for admins, teachers, and
                                students—no spreadsheets, no chaos.
                            </p>
                            <div className="mt-8 flex flex-wrap gap-3">
                                <Link
                                    href="/register"
                                    className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex rounded-md px-6 py-3 text-sm font-medium"
                                >
                                    Get started
                                </Link>
                                <Link
                                    href="/login"
                                    className="border-border bg-background hover:bg-muted inline-flex rounded-md border px-6 py-3 text-sm font-medium"
                                >
                                    See how it works
                                </Link>
                            </div>
                            <p className="text-muted-foreground mt-4 text-sm">
                                Used by teams running mock tests and live
                                practice in one place.
                            </p>
                        </div>
                        <div className="relative flex min-w-0 justify-center md:justify-end">
                            <div className="relative w-full max-w-md overflow-hidden rounded-xl">
                                <Image
                                    src="/online.svg"
                                    alt="Online mock tests and practice sessions"
                                    width={480}
                                    height={360}
                                    className="h-auto w-full object-contain"
                                    priority
                                    unoptimized
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Most students / pain points – centered heading + 3 blocks + paragraph */}
                <section className="px-4 py-12 sm:px-6 sm:py-16">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
                            Running mock tests? Most people still juggle between{" "}
                            <br />
                            <span className="text-primary">
                                test centers and exam halls.
                            </span>
                        </h2>
                        <div className="mt-10 grid gap-8 sm:grid-cols-3">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4">
                                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                                        <DocIcon className="size-5" />
                                    </span>
                                    <p className="text-muted-foreground text-sm">
                                        Paper or spreadsheets don’t reflect
                                        who’s free and who’s booked.
                                    </p>
                                </div>
                                <p className="text-muted-foreground pl-14 text-sm">
                                    When availability lives in docs or inboxes,
                                    students and teachers waste time figuring
                                    out free slots—and double bookings slip
                                    through.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4">
                                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                                        <DocIcon className="size-5" />
                                    </span>
                                    <p className="text-muted-foreground text-sm">
                                        Chasing availability across tools wastes
                                        time for everyone.
                                    </p>
                                </div>
                                <p className="text-muted-foreground pl-14 text-sm">
                                    Switching between email, calendars, and
                                    sheets means missed messages and mismatched
                                    expectations. One place keeps everyone on
                                    the same page.
                                </p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4">
                                    <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-lg">
                                        <DocIcon className="size-5" />
                                    </span>
                                    <p className="text-muted-foreground text-sm">
                                        Package and class counts get lost
                                        between systems.
                                    </p>
                                </div>
                                <p className="text-muted-foreground pl-14 text-sm">
                                    Without a single record, remaining classes
                                    and enrollments get out of sync. IVCS tracks
                                    packages and usage so nothing is lost in
                                    translation.
                                </p>
                            </div>
                        </div>
                        <p className="text-muted-foreground mx-auto mt-8 max-w-2xl text-center text-sm">
                            IVCS gives you one place to set availability, enroll
                            in packages, and book mock tests and practice
                            sessions—so students and teachers stay aligned.
                        </p>
                    </div>
                </section>

                {/* Merged: A better way + Platform built for – one section with comfort-from-home */}
                <section className="bg-muted/20 px-4 py-12 sm:px-6 sm:py-16">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
                            A platform built for online mock tests—take them
                            from the{" "}
                            <span className="text-primary">
                                comfort of your home
                            </span>
                        </h2>
                        <p className="text-muted-foreground mx-auto mt-4 max-w-2xl text-center text-sm">
                            No commute, no stress. Prepare at your own pace with
                            real availability, instant booking, and one simple
                            dashboard.
                        </p>
                        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <HomeIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    From the comfort of home
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Take mock tests and practice sessions
                                    wherever you're most at ease. No need to
                                    travel—just log in and go.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <MonitorIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    Real availability
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Teachers set slots. Students see only open
                                    times and book from their package.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <CheckIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    Instant booking
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    One click to book. Class count updates
                                    automatically so nothing is overbooked.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <ChartIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    One dashboard
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Admin, teacher, and student views in one
                                    platform. No more switching tools.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Everything you need – 4 detailed modules (kept as 5th section) */}
                <section className="bg-muted/20 px-4 py-12 sm:px-6 sm:py-16">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
                            Everything you need in{" "}
                            <span className="text-primary">one place</span>
                        </h2>
                        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <CalendarIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    Availability
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Set your open slots by date and time.
                                    Students only see times you’ve marked
                                    available.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <PencilIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    Bookings
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Book a session from an enrolled package. One
                                    class is deducted automatically.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <PackageIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    Packages
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Enroll in packages and see remaining
                                    classes. No spreadsheets required.
                                </p>
                            </div>
                            <div className="rounded-lg border border-border bg-card p-6">
                                <span className="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-lg">
                                    <MicIcon className="size-5" />
                                </span>
                                <h3 className="mt-4 font-semibold text-foreground">
                                    Roles
                                </h3>
                                <p className="text-muted-foreground mt-2 text-sm">
                                    Admin, teacher, and student dashboards with
                                    the right tools for each role.
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                <ProgressBarsSection />

                {/* Simple pricing – one card */}
                <section className="bg-muted/20 px-4 py-12 sm:px-6 sm:py-16">
                    <div className="container mx-auto max-w-6xl">
                        <h2 className="text-center text-2xl font-bold text-foreground sm:text-3xl">
                            Simple pricing
                        </h2>
                        <div className="border-border bg-card mx-auto mt-10 max-w-md rounded-lg border p-6 shadow-sm">
                            <h3 className="font-semibold text-foreground">
                                Mock test & session packages
                            </h3>
                            <p className="text-muted-foreground mt-1 text-sm">
                                Book mock tests and practice sessions from
                                packages that fit your goals.
                            </p>
                            <ul className="text-muted-foreground mt-4 space-y-2 text-sm">
                                <li>• Clear class count per package</li>
                                <li>• Book from your enrolled packages</li>
                                <li>• One place for students and teachers</li>
                            </ul>
                            <p className="mt-4 text-2xl font-bold text-foreground">
                                From your admin
                            </p>
                            <p className="text-muted-foreground text-sm">
                                Packages and pricing set by your organization.
                            </p>
                            <Link
                                href="/register"
                                className="bg-primary text-primary-foreground hover:bg-primary/90 mt-6 block w-full rounded-md py-3 text-center text-sm font-medium"
                            >
                                Get started
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Dark CTA – Know your level / Start */}
                <section className="bg-foreground px-4 py-12 sm:px-6 sm:py-16">
                    <div className="container mx-auto max-w-3xl text-center">
                        <h2 className="text-2xl font-bold text-background sm:text-3xl">
                            Ready to take your mock tests online?
                        </h2>
                        <p className="text-background/80 mt-4 text-base">
                            Join IVCS and keep availability, packages, and
                            bookings in sync so you as a student can focus on
                            practice, not paperwork.
                        </p>
                        <Link
                            href="/register"
                            className="bg-background text-foreground hover:bg-background/90 mt-8 inline-block rounded-md px-6 py-3 text-sm font-medium"
                        >
                            Get started
                        </Link>
                    </div>
                </section>

                {/* Footer – 4 columns + bottom bar */}
                <footer className="border-border border-t px-4 py-10 sm:px-6">
                    <div className="container mx-auto max-w-6xl">
                        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    Product
                                </h4>
                                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                                    <li>
                                        <Link
                                            href="/packages"
                                            className="hover:text-foreground"
                                        >
                                            Packages
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/calendar"
                                            className="hover:text-foreground"
                                        >
                                            Calendar
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    App
                                </h4>
                                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                                    <li>
                                        <Link
                                            href="/login"
                                            className="hover:text-foreground"
                                        >
                                            Login
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href="/register"
                                            className="hover:text-foreground"
                                        >
                                            Sign up
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    Company
                                </h4>
                                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                                    <li>
                                        <span className="cursor-default">
                                            IVCS
                                        </span>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                <h4 className="font-semibold text-foreground">
                                    Legal
                                </h4>
                                <ul className="text-muted-foreground mt-3 space-y-2 text-sm">
                                    <li>
                                        <span className="cursor-default">
                                            Privacy
                                        </span>
                                    </li>
                                    <li>
                                        <span className="cursor-default">
                                            Terms
                                        </span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                        <div className="border-border mt-10 flex flex-col items-center justify-between gap-4 border-t pt-6 sm:flex-row">
                            <Link
                                href="/"
                                className="flex items-center gap-2 font-semibold text-foreground"
                            >
                                <span className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded">
                                    <LogoIcon className="size-3" />
                                </span>
                                IVCS
                            </Link>
                            <p className="text-muted-foreground text-sm">
                                © {new Date().getFullYear()} IVCS. All rights
                                reserved.
                            </p>
                        </div>
                    </div>
                </footer>
            </main>
        </div>
    );
}
