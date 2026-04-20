import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingHeader } from "@/components/landing-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ScoreMirror – Computer-Based IELTS Mock Tests",
    description:
        "Full computer-based IELTS mock tests with human writing review, timed sections, and performance reports — so test day feels familiar.",
    keywords: [
        "IELTS mock test",
        "computer-based IELTS",
        "IELTS practice",
        "IELTS speaking",
        "IELTS writing review",
    ],
    alternates: { canonical: "/" },
    openGraph: {
        title: "ScoreMirror – Computer-Based IELTS Mock Tests",
        description:
            "Full computer-based IELTS mock tests with human review and performance reports.",
        url: "/",
        images: [
            { url: "/hero.png", width: 1200, height: 630, alt: "ScoreMirror" },
        ],
    },
};

const accent = "#7C5CFF";
const dark = "#0B0B0F";
const light = "#F7F7F7";
const coolBand = "#eef0f4";

function Display({
    children,
    className = "",
}: {
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <span
            className={`[font-family:var(--font-playfair),Georgia,serif] ${className}`}
        >
            {children}
        </span>
    );
}

function CheckLi({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex gap-3 text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
            <span
                className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: accent }}
                aria-hidden
            >
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                >
                    <path d="M20 6 9 17l-5-5" />
                </svg>
            </span>
            <span>{children}</span>
        </li>
    );
}

function CardBullet({ children }: { children: React.ReactNode }) {
    return (
        <li className="flex gap-2 text-sm leading-relaxed text-[#3d3d4a]">
            <span
                className="mt-2 size-1 shrink-0 rounded-full bg-[#c4c4d0]"
                aria-hidden
            />
            <span>{children}</span>
        </li>
    );
}

function ListeningMock() {
    return (
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_25px_60px_-15px_rgba(15,15,25,0.25)]">
            <div className="flex items-center gap-2 border-b border-black/[0.06] bg-[#f3f3f5] px-3 py-2.5">
                <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                <span className="size-2.5 rounded-full bg-[#febc2e]" />
                <span className="size-2.5 rounded-full bg-[#28c840]" />
                <span
                    className="ml-3 rounded-full px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-white"
                    style={{ backgroundColor: accent }}
                >
                    Listening
                </span>
                <span className="text-[10px] text-[#888]">
                    Section 1 of 4 · Academic
                </span>
                <span className="ml-auto flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                    <span className="size-1.5 rounded-full bg-emerald-500" />
                    12:04
                </span>
            </div>
            <div className="grid grid-cols-[7.5rem_1fr] gap-0 max-sm:grid-cols-1">
                <div className="border-r border-black/[0.06] bg-[#eeeff2] p-3 max-sm:border-r-0 max-sm:border-b">
                    <p className="text-[9px] font-bold uppercase tracking-wider text-[#666]">
                        Questions
                    </p>
                    <div className="mt-2 grid grid-cols-4 gap-1">
                        {Array.from({ length: 8 }, (_, i) => (
                            <span
                                key={i}
                                className={`flex size-7 items-center justify-center rounded-md text-[10px] font-semibold ${
                                    i === 3
                                        ? "text-white"
                                        : "border border-black/[0.06] bg-white text-[#555]"
                                }`}
                                style={
                                    i === 3
                                        ? { backgroundColor: accent }
                                        : undefined
                                }
                            >
                                {i + 1}
                            </span>
                        ))}
                    </div>
                    <p className="mt-3 text-[9px] font-bold uppercase tracking-wider text-[#666]">
                        Sections
                    </p>
                    <ul className="mt-1.5 space-y-1 text-[10px] text-[#444]">
                        <li
                            className="rounded-md px-2 py-1 font-medium"
                            style={{
                                backgroundColor: `${accent}18`,
                                color: accent,
                            }}
                        >
                            · Listening
                        </li>
                        <li className="px-2 py-1">Reading</li>
                        <li className="px-2 py-1">Writing</li>
                        <li className="px-2 py-1">Speaking</li>
                    </ul>
                </div>
                <div className="bg-white p-4 sm:p-5">
                    <p className="text-[9px] font-bold uppercase tracking-widest text-[#888]">
                        Part 1 · Questions 1–10
                    </p>
                    <p className="mt-3 text-[11px] leading-relaxed text-[#333] sm:text-xs">
                        You will hear a number of different recordings and you
                        will have to answer questions on what you hear. There
                        will be time for you to read the instructions and
                        questions, and you will have a chance to check your
                        work.
                    </p>
                    <p className="mt-4 text-[11px] font-semibold text-[#111] sm:text-sm">
                        Question 4 · Complete the note
                    </p>
                    <div className="mt-2 space-y-2 rounded-xl border border-black/[0.06] bg-[#fafafa] p-3">
                        <div className="h-2 w-3/4 rounded bg-[#e5e5ea]" />
                        <div className="h-2 w-full max-w-[200px] rounded bg-[#e5e5ea]" />
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-between border-t border-black/[0.06] bg-white px-4 py-2.5 text-[11px] font-semibold">
                <span style={{ color: accent }}>← Previous</span>
                <span className="text-[#888]">4 / 40</span>
                <span style={{ color: accent }}>Next →</span>
            </div>
        </div>
    );
}

/** Static landing prices (NPR) — aligned to `public/price.png`; replace with catalog data when wired. */
const LANDING_PRICING_TIERS = [
    {
        key: "standard",
        title: "Standard (48h+)",
        amount: 1400,
        tagline: "Plan ahead",
    },
    {
        key: "priority",
        title: "Priority (24-48h)",
        amount: 1680,
        tagline: "Need it soon",
    },
    {
        key: "instant",
        title: "Instant (Same day)",
        amount: 1820,
        tagline: "Book for today",
    },
] as const;

function formatNpr(n: number) {
    return n.toLocaleString("en-NP", { maximumFractionDigits: 0 });
}

export default async function HomePage() {
    const footerPages = await prisma.staticPage.findMany({
        where: { isActive: true },
        select: { title: true, slug: true },
        orderBy: { createdAt: "asc" },
    });

    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ScoreMirror",
        url: "https://scoremirror.test",
        description:
            "Full computer-based IELTS mock tests with human review and performance reports.",
    };

    const legalPages = footerPages.filter((p) =>
        /terms|privacy|policy|legal/i.test(p.title),
    );
    const otherPages = footerPages.filter(
        (p) => !/terms|privacy|policy|legal/i.test(p.title),
    );

    return (
        <div className="flex min-h-svh flex-col">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
            {/* Hero */}
            <section
                className="relative pb-16 pt-28 sm:pb-24 sm:pt-32 lg:pb-28 lg:pt-36"
                style={{ backgroundColor: dark }}
            >
                <LandingHeader />

                <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-10 px-4 sm:gap-14 sm:px-6 lg:grid-cols-2 lg:gap-16">
                    <div className="min-w-0 text-center lg:text-left">
                        <h1 className="text-[1.75rem] font-normal leading-[1.15] tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
                            <Display>
                                Your IELTS exam environment. Practised with{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    real structure
                                </em>
                                .
                            </Display>
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base lg:mx-0 mx-auto">
                            Timed, computer-delivered mock tests with human
                            feedback on writing and a clear performance report —
                            so pacing, navigation, and focus feel second nature
                            on test day.
                        </p>
                        <div className="mt-8 flex flex-col flex-wrap justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
                            <Link
                                href="/packages"
                                className="inline-flex min-h-12 items-center justify-center rounded-2xl px-7 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 sm:min-h-0 sm:px-8 sm:py-3.5"
                                style={{
                                    backgroundColor: accent,
                                    boxShadow: `0 12px 40px -8px ${accent}88`,
                                }}
                            >
                                Start a Mock Test
                            </Link>
                            <Link
                                href="#experience"
                                className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/40 bg-transparent px-7 text-sm font-semibold text-white transition hover:bg-white/10 sm:min-h-0 sm:px-8 sm:py-3.5"
                            >
                                How we evaluate
                            </Link>
                        </div>
                    </div>

                    <div className="relative flex min-w-0 justify-center lg:justify-end">
                        <div className="relative w-full max-w-[min(100%,520px)]">
                            <div
                                className="absolute -inset-4 -z-10 rounded-[2rem] opacity-40 blur-3xl sm:-inset-6"
                                style={{
                                    background: `radial-gradient(ellipse at center, ${accent}55, transparent 65%)`,
                                }}
                                aria-hidden
                            />
                            <Image
                                src="/hero.png"
                                alt="Computer-based IELTS reading test interface preview"
                                width={1040}
                                height={780}
                                className="h-auto w-full rounded-2xl object-contain shadow-2xl"
                                priority
                                sizes="(max-width: 1024px) 100vw, 520px"
                            />
                        </div>
                    </div>
                </div>
            </section>

            {/* Feature cards */}
            <section
                id="features"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: light }}
            >
                <div className="mx-auto max-w-6xl">
                    <h2 className="mx-auto max-w-3xl text-center text-xl leading-snug text-[#1a1a22] sm:text-2xl md:text-3xl md:leading-snug">
                        <Display>
                            Not a coaching reel. Not a loose question bank. A{" "}
                            <em
                                className="font-semibold italic"
                                style={{ color: accent }}
                            >
                                full mock
                            </em>{" "}
                            in one sitting.
                        </Display>
                    </h2>
                    <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
                        {(
                            [
                                {
                                    title: "Computer-delivered mock",
                                    bullets: [
                                        "All four skills in one timed flow",
                                        "Navigation and prompts aligned to exam style",
                                        "Stay in one interface from listening to writing",
                                    ],
                                    href: "#experience",
                                    cta: "See the interface",
                                },
                                {
                                    title: "Human writing review",
                                    bullets: [
                                        "Comments on task achievement and cohesion",
                                        "Grammar and vocabulary tied to descriptors",
                                        "Actionable notes for your next attempt",
                                    ],
                                    href: "#pricing",
                                    cta: "View pricing",
                                },
                                {
                                    title: "What makes us different",
                                    bullets: [
                                        "Performance report with skill breakdowns",
                                        "Trend view so you can track improvement",
                                        "Simple, transparent bundle pricing",
                                    ],
                                    href: "#faq",
                                    cta: "Read the FAQs",
                                },
                            ] as const
                        ).map((card) => (
                            <div
                                key={card.title}
                                className="flex flex-col rounded-2xl border border-black/[0.06] bg-white p-6 shadow-[0_20px_50px_-20px_rgba(15,15,25,0.18)] sm:p-8"
                            >
                                <h3 className="text-lg font-semibold text-[#0B0B0F]">
                                    {card.title}
                                </h3>
                                <ul className="mt-5 flex flex-1 flex-col gap-3">
                                    {card.bullets.map((b) => (
                                        <CardBullet key={b}>{b}</CardBullet>
                                    ))}
                                </ul>
                                <Link
                                    href={card.href}
                                    className="mt-8 inline-flex text-sm font-semibold transition hover:opacity-80"
                                    style={{ color: accent }}
                                >
                                    {card.cta} →
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Exam interface — ListeningMock */}
            <section
                id="experience"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: coolBand }}
            >
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="min-w-0">
                        <h2 className="text-2xl leading-tight text-[#0B0B0F] sm:text-3xl md:text-[2rem] md:leading-tight">
                            <Display>
                                Computer-delivered IELTS is not harder.{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    It is just different.
                                </em>
                            </Display>
                        </h2>
                        <div className="mt-6 space-y-5 text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
                            <p>
                                The official test rewards familiarity with
                                on-screen timing, question layouts, and
                                navigation. Paper habits do not transfer
                                automatically — you need reps in the same
                                medium.
                            </p>
                            <p>
                                ScoreMirror keeps you inside a coherent,
                                distraction-minimised flow so you learn where
                                controls live before it counts.
                            </p>
                        </div>
                        <ul className="mt-8 space-y-4">
                            <CheckLi>
                                Same section timing and progression as exam day
                            </CheckLi>
                            <CheckLi>
                                Practice from anywhere — no travel for the
                                mock interface
                            </CheckLi>
                            <CheckLi>
                                A recorded trail of attempts via your reports
                            </CheckLi>
                        </ul>
                        <p
                            className="mt-8 text-[0.9375rem] font-semibold"
                            style={{ color: accent }}
                        >
                            No guesswork. Just the rhythm of the real test.
                        </p>
                    </div>
                    <div className="flex min-w-0 justify-center lg:justify-end">
                        <div className="w-full max-w-[min(100%,520px)]">
                            <ListeningMock />
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing — tiers from public/price.png; cards match feature-band system */}
            <section
                id="pricing"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: light }}
            >
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-center text-2xl text-[#0B0B0F] sm:text-3xl md:text-[2rem]">
                        <Display>
                            Pricing based on when you{" "}
                            <em
                                className="font-semibold italic"
                                style={{ color: accent }}
                            >
                                need it
                            </em>
                            .
                        </Display>
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-center text-sm text-[#5c5c6a] sm:text-base">
                        Choose a lead time that fits your schedule. Bundles may
                        include speaking sessions and writing review — see
                        catalog for full detail.
                    </p>
                    <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
                        {LANDING_PRICING_TIERS.map((tier) => (
                            <div
                                key={tier.key}
                                className="flex h-full flex-col rounded-2xl border border-black/[0.06] bg-white p-6 text-center shadow-[0_20px_50px_-20px_rgba(15,15,25,0.18)] sm:p-8"
                            >
                                <h3 className="text-base font-semibold text-[#0B0B0F]">
                                    {tier.title}
                                </h3>
                                <p className="mt-3 text-sm leading-normal text-[#5c5c6a]">
                                    {tier.tagline}
                                </p>
                                <p className="mt-6 flex flex-wrap items-baseline justify-center gap-1.5">
                                    <span className="text-sm font-medium text-[#5c5c6a]">
                                        NPR
                                    </span>
                                    <Display className="text-4xl font-semibold text-[#0B0B0F] sm:text-5xl">
                                        {formatNpr(tier.amount)}
                                    </Display>
                                </p>
                                <div
                                    className="mt-8 flex-1"
                                    aria-hidden
                                />
                                <Link
                                    href="/login"
                                    className="inline-flex min-h-12 w-full items-center justify-center rounded-2xl px-7 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 sm:min-h-0 sm:px-8 sm:py-3.5"
                                    style={{
                                        backgroundColor: accent,
                                        boxShadow: `0 12px 40px -8px ${accent}88`,
                                    }}
                                >
                                    Select
                                </Link>
                            </div>
                        ))}
                    </div>
                    <p className="mx-auto mt-10 max-w-2xl text-center text-xs leading-relaxed text-[#7a7a8a] sm:text-sm">
                        Shown amounts are static placeholders (NPR). Live
                        bundle pricing is available after sign-in on the
                        packages page.
                    </p>
                </div>
            </section>

            {/* FAQ */}
            <section
                id="faq"
                className="bg-white px-4 py-16 sm:px-6 sm:py-20 md:py-24"
            >
                <div className="mx-auto max-w-3xl">
                    <h2 className="text-center text-2xl text-[#0B0B0F] sm:text-3xl md:text-[2rem]">
                        <Display>
                            Read this before you book another{" "}
                            <em
                                className="font-semibold italic"
                                style={{ color: accent }}
                            >
                                loose practice session
                            </em>
                            .
                        </Display>
                    </h2>
                    <div className="mt-10 space-y-3">
                        {(
                            [
                                {
                                    q: "Why might an informal mock score mislead you?",
                                    a: "Informal mocks often skip strict timing, on-screen navigation, or consistent rubric application. A computer-delivered full mock surfaces gaps in exam mechanics — not just topic knowledge.",
                                },
                                {
                                    q: "Computer-delivered vs paper — what actually changes?",
                                    a: "You interact with timers, scrolling, highlighting, and section transitions differently. Rehearsing in a browser-like flow reduces cognitive load on test day.",
                                },
                                {
                                    q: "Automated feedback vs human review on writing?",
                                    a: "Automated tools can miss nuance in task achievement and tone. Human reviewers align comments with band descriptors so you know what to fix next.",
                                },
                            ] as const
                        ).map((item) => (
                            <details
                                key={item.q}
                                className="group rounded-2xl border border-black/[0.06] bg-[#fafafa] transition-colors open:bg-white open:shadow-sm"
                            >
                                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold text-[#0B0B0F] sm:px-5 sm:text-base [&::-webkit-details-marker]:hidden">
                                    <span className="min-w-0 pr-2">
                                        {item.q}
                                    </span>
                                    <svg
                                        className="size-5 shrink-0 text-[#888] transition-transform duration-200 group-open:rotate-180"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke="currentColor"
                                        strokeWidth="2"
                                        aria-hidden
                                    >
                                        <path d="M6 9l6 6 6-6" />
                                    </svg>
                                </summary>
                                <div className="border-t border-black/[0.06] px-4 pb-4 pt-3 text-sm leading-relaxed text-[#3d3d4a] sm:px-5">
                                    {item.a}
                                </div>
                            </details>
                        ))}
                    </div>
                    {otherPages.length > 0 && (
                        <div className="mt-8 text-center">
                            <Link
                                href={`/${otherPages[0].slug}`}
                                className="text-sm font-semibold transition hover:opacity-80"
                                style={{ color: accent }}
                            >
                                View all articles →
                            </Link>
                        </div>
                    )}
                </div>
            </section>

            {/* Final CTA */}
            <section
                className="px-4 py-16 text-center sm:px-6 sm:py-24 md:py-28"
                style={{ backgroundColor: dark }}
            >
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-white/70">
                    Ready when you are
                </p>
                <h2 className="mx-auto mt-4 max-w-3xl text-2xl text-white sm:text-3xl md:text-[2.5rem] md:leading-tight">
                    <Display>
                        Start before{" "}
                        <em
                            className="font-semibold italic"
                            style={{ color: accent }}
                        >
                            you feel ready
                        </em>
                        .
                    </Display>
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-sm text-white/65 sm:text-base">
                    Experience the exam once — everything changes after that.
                </p>
                <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
                    <Link
                        href="/packages"
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 sm:min-h-0 sm:px-8 sm:py-3.5"
                        style={{
                            backgroundColor: accent,
                            boxShadow: `0 12px 40px -8px ${accent}88`,
                        }}
                    >
                        Start a Mock Test
                    </Link>
                    <Link
                        href="#experience"
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/40 bg-transparent px-8 text-sm font-semibold text-white transition hover:bg-white/10 sm:min-h-0 sm:px-8 sm:py-3.5"
                    >
                        How we evaluate
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-black/[0.06] bg-white px-4 py-12 sm:px-6 sm:py-14">
                <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    <div className="lg:col-span-1">
                        <Link
                            href="/"
                            className="text-lg font-semibold"
                            style={{ color: accent }}
                        >
                            ScoreMirror
                        </Link>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#5c5c6a]">
                            Computer-based IELTS mocks, human writing review, and
                            reports — built for exam day confidence.
                        </p>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
                            Quick links
                        </p>
                        <nav
                            className="mt-4 flex flex-col gap-2 text-sm text-[#3d3d4a]"
                            aria-label="Quick links"
                        >
                            <Link href="/" className="hover:opacity-80">
                                Home
                            </Link>
                            <Link href="#features" className="hover:opacity-80">
                                Features
                            </Link>
                            <Link
                                href="#experience"
                                className="hover:opacity-80"
                            >
                                The experience
                            </Link>
                            <Link href="#pricing" className="hover:opacity-80">
                                Pricing
                            </Link>
                            <Link href="/login" className="hover:opacity-80">
                                Log in
                            </Link>
                            <Link href="/register" className="hover:opacity-80">
                                Get started
                            </Link>
                        </nav>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
                            Services
                        </p>
                        <nav
                            className="mt-4 flex flex-col gap-2 text-sm text-[#3d3d4a]"
                            aria-label="Services"
                        >
                            <Link href="/packages" className="hover:opacity-80">
                                Mock tests &amp; bundles
                            </Link>
                            <Link href="#faq" className="hover:opacity-80">
                                FAQs
                            </Link>
                        </nav>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
                            Legal &amp; pages
                        </p>
                        <nav
                            className="mt-4 flex flex-col gap-2 text-sm text-[#3d3d4a]"
                            aria-label="Legal"
                        >
                            {legalPages.map((page) => (
                                <Link
                                    key={page.slug}
                                    href={`/${page.slug}`}
                                    className="hover:opacity-80"
                                >
                                    {page.title}
                                </Link>
                            ))}
                            {otherPages.map((page) => (
                                <Link
                                    key={page.slug}
                                    href={`/${page.slug}`}
                                    className="hover:opacity-80"
                                >
                                    {page.title}
                                </Link>
                            ))}
                            {footerPages.length === 0 && (
                                <span className="text-[#9a9aaa]">
                                    No pages yet
                                </span>
                            )}
                        </nav>
                    </div>
                </div>
                <p className="mx-auto mt-12 max-w-6xl border-t border-black/[0.06] pt-8 text-center text-xs text-[#9a9aaa] sm:text-left">
                    © {new Date().getFullYear()} ScoreMirror
                </p>
            </footer>
        </div>
    );
}
