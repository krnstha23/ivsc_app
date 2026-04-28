import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingHeader } from "@/components/landing-header";
import { formatRs } from "@/lib/format-rs";
import { prisma } from "@/lib/prisma";
import { serializeJsonForHtmlScript } from "@/lib/security";

export const metadata: Metadata = {
    title: "ScoreMirror – Computer-Based IELTS Evaluations",
    description:
        "Full computer-based IELTS evaluations with human writing review, timed sections, and performance reports — so test day feels familiar.",
    keywords: [
        "IELTS evaluation",
        "computer-based IELTS",
        "IELTS practice",
        "IELTS speaking",
        "IELTS writing review",
    ],
    alternates: { canonical: "/" },
    openGraph: {
        title: "ScoreMirror – Computer-Based IELTS Evaluations",
        description:
            "Full computer-based IELTS evaluations with human review and performance reports.",
        url: "/",
        images: [
            { url: "/hero.jpg", width: 1200, height: 630, alt: "ScoreMirror" },
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
            "Full computer-based IELTS evaluations with human review and performance reports.",
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
                dangerouslySetInnerHTML={{
                    __html: serializeJsonForHtmlScript(jsonLd),
                }}
            />
            {/* Hero */}
            <section
                className="relative pt-28 sm:pb-24 sm:pt-32 lg:pb-28 lg:pt-36"
                style={{ backgroundColor: dark }}
            >
                <LandingHeader />

                <div className="relative z-[1] mx-auto grid max-w-6xl items-center gap-10 px-4 sm:gap-14 sm:px-6 lg:grid-cols-2 lg:gap-16">
                    <div className="min-w-0 text-center lg:text-left">
                        <h1 className="text-[1.75rem] font-normal leading-[1.15] tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
                            <Display>
                                Your IELTS speaking level. Evaluated by{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    humans
                                </em>
                                .
                            </Display>
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base lg:mx-0 mx-auto">
                            A premium, human-led speaking and writing evaluation
                            service for IELTS. No score guarantees. No quick
                            tricks. Just your real caliber — reflected.
                        </p>
                        <p className="mt-6 text-xs leading-relaxed text-white/45 lg:mx-0 mx-auto max-w-sm">
                            Evaluators trained under real-exam standard metrics.
                            Just honest, expert feedback.
                        </p>
                        <div className="mt-5 flex flex-col flex-wrap justify-center gap-3 sm:flex-row sm:gap-4 lg:justify-start">
                            <Link
                                href="/login"
                                className="inline-flex min-h-12 items-center justify-center rounded-2xl px-7 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 sm:min-h-0 sm:px-8 sm:py-3.5"
                                style={{
                                    backgroundColor: accent,
                                    boxShadow: `0 12px 40px -8px ${accent}88`,
                                }}
                            >
                                Book your evaluation
                            </Link>
                            <Link
                                href="/how-we-evaluate"
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
                                src="/hero.jpg"
                                alt="Computer-based IELTS reading test interface preview"
                                width={5600}
                                height={3733}
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
                    <h2 className="mx-auto flex max-w-3xl flex-col items-center justify-center text-center text-xl leading-snug text-[#1a1a22] sm:text-2xl md:text-3xl md:leading-snug">
                        <Display>
                            Not a coaching institute. An evaluation-led
                            platform.{" "}
                        </Display>
                        <Display>
                            <em
                                className="font-semibold italic"
                                style={{ color: accent }}
                            >
                                A caliber check.
                            </em>
                        </Display>
                    </h2>
                    <div className="mt-12 grid gap-6 md:grid-cols-3 md:gap-8">
                        {(
                            [
                                {
                                    title: "Live Speaking Evaluation (VCS)",
                                    bullets: [
                                        "12–14 min live examiner format",
                                        "Real-time scoring with human judgment",
                                        "Recorded session + diagnostic notes",
                                        "Brief verbal debrief after completion",
                                    ],
                                    href: "/speaking-evaluation",
                                    cta: "Learn More",
                                },
                                {
                                    title: "Writing Evaluation (Async)",
                                    bullets: [
                                        "Submit Task 1 + Task 2 essays",
                                        "Band-linked written correction",
                                        "Feedback mapped to rubric criteria",
                                        "No auto-generated scoring",
                                    ],
                                    href: "/writing-evaluation",
                                    cta: "Learn More",
                                },
                                {
                                    title: "What makes us different",
                                    bullets: [
                                        "We don't coach. We diagnose performance.",
                                        "No crowded batches or noisy classes.",
                                        "Only your real level, clearly reflected.",
                                    ],
                                    href: "/why-us",
                                    cta: "Learn More",
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

            {/* Experience — image */}
            <section
                id="experience"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: coolBand }}
            >
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="min-w-0">
                        <h2 className="text-2xl leading-tight text-[#0B0B0F] sm:text-3xl md:text-[2rem] md:leading-tight">
                            <Display>
                                Video Call Speaking is not harder.{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    It's just different.
                                </em>
                            </Display>
                        </h2>
                        <div className="mt-6 space-y-5 text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
                            <p>
                                In real IELTS, power doesn't come from grammar
                                alone. It comes from confidence and speaking
                                flow in a face-to-face test format.
                            </p>
                            <p>
                                ScoreMirror helps you build that comfort using
                                practical sessions that feel close to the
                                speaking test environment.
                            </p>
                        </div>
                        <ul className="mt-8 space-y-4">
                            <CheckLi>
                                Structured one-to-one video call format
                            </CheckLi>
                            <CheckLi>
                                No travel, no waiting room pressure
                            </CheckLi>
                            <CheckLi>
                                Recorded session for your review
                            </CheckLi>
                        </ul>
                        <p
                            className="mt-8 text-[0.9375rem] font-semibold"
                            style={{ color: accent }}
                        >
                            No fear. Just the future of IELTS testing.
                        </p>
                    </div>
                    <div className="flex min-w-0 justify-center lg:justify-end">
                        <div className="relative w-full max-w-[min(100%,520px)]">
                            <Image
                                src="/sec.jpg"
                                alt="One-to-one evaluation and learning session"
                                width={5471}
                                height={3647}
                                className="h-auto w-full rounded-2xl object-cover shadow-[0_25px_60px_-15px_rgba(15,15,25,0.25)]"
                                sizes="(max-width: 1024px) 100vw, 520px"
                            />
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
                                    <Display className="text-4xl font-semibold text-[#0B0B0F] sm:text-5xl">
                                        {formatRs(tier.amount, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </Display>
                                </p>
                                <div
                                    className="mt-8 flex-1"
                                    aria-hidden
                                />
                                <Link
                                    href="/pricing"
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
                                    q: "Why might an informal evaluation mislead you?",
                                    a: "Informal evaluations often skip strict timing, on-screen navigation, or consistent rubric application. A structured, computer-delivered evaluation surfaces gaps in exam mechanics — not just topic knowledge.",
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
                    <div className="mt-8 text-center">
                        <Link
                            href="#faq"
                            className="text-sm font-semibold transition hover:opacity-80"
                            style={{ color: accent }}
                        >
                            View all articles →
                        </Link>
                    </div>
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
                        href="/login"
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 sm:min-h-0 sm:px-8 sm:py-3.5"
                        style={{
                            backgroundColor: accent,
                            boxShadow: `0 12px 40px -8px ${accent}88`,
                        }}
                    >
                        Start your evaluation
                    </Link>
                    <Link
                        href="/how-we-evaluate"
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
                            Human-led speaking and writing evaluation for IELTS.
                            Honest feedback. Real caliber.
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
                            <Link href="/about-us" className="hover:opacity-80">
                                About Us
                            </Link>
                            <Link href="/how-we-evaluate" className="hover:opacity-80">
                                How We Evaluate
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
                            <Link href="/speaking-evaluation" className="hover:opacity-80">
                                Speaking Evaluation
                            </Link>
                            <Link href="/writing-evaluation" className="hover:opacity-80">
                                Writing Evaluation
                            </Link>
                            <Link href="/why-us" className="hover:opacity-80">
                                Why Us
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
