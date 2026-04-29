import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingHeader } from "@/components/landing-header";
import { formatRs } from "@/lib/format-rs";
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
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "ScoreMirror",
        url: "https://scoremirror.test",
        description:
            "Full computer-based IELTS evaluations with human review and performance reports.",
    };

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
                className="relative pb-12 pt-28 sm:pb-24 sm:pt-32 lg:pb-28 lg:pt-36"
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
                                    the test experts
                                </em>
                                .
                            </Display>
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base lg:mx-0 mx-auto">
                            A premium, human-led IELTS speaking and writing
                            evaluation service. Just your current standing
                            reflected — unfiltered.
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
                                Book Speaking Evaluation
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
                                src="/sec.jpg"
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
                    <h2 className="mx-auto max-w-3xl text-center text-xl leading-snug text-[#1a1a22] sm:text-2xl md:text-3xl md:leading-snug">
                        <Display>
                            A human-led IELTS evaluation service. A caliber check.
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

            {/* Experience — the medium */}
            <section
                id="experience"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: coolBand }}
            >
                <div className="mx-auto max-w-3xl text-center">
                    <h2 className="text-2xl leading-tight text-[#0B0B0F] sm:text-3xl md:text-[2rem] md:leading-tight">
                        <Display>
                            The medium does not change what gets evaluated.
                        </Display>
                    </h2>
                    <ul className="mt-10 space-y-6 text-left text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
                        <CheckLi>
                            The examiner evaluates your fluency, vocabulary, grammar, and pronunciation — not whether you are on a screen or physically in a room.
                        </CheckLi>
                        <CheckLi>
                            In many parts of the world, test takers do not ask this question. They sit, speak, and get evaluated. The medium is invisible.
                        </CheckLi>
                        <CheckLi>
                            You already use video calls every day. Taking your IELTS speaking test on one changes nothing about how you are assessed.
                        </CheckLi>
                    </ul>
                    <p className="mt-8 text-[0.9375rem] font-semibold text-[#0B0B0F]">
                        So practice the same way. On a video call. With a real human evaluator.
                    </p>
                    <div className="mt-8 flex justify-center">
                        <Link
                            href="/login"
                            className="inline-flex min-h-12 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white shadow-lg transition hover:opacity-95 sm:min-h-0 sm:px-8 sm:py-3.5"
                            style={{
                                backgroundColor: accent,
                                boxShadow: `0 12px 40px -8px ${accent}88`,
                            }}
                        >
                            Book Your Speaking Evaluation
                        </Link>
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section
                id="pricing"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: light }}
            >
                <div className="mx-auto max-w-6xl">
                    <h2 className="text-center text-2xl sm:text-3xl md:text-[2rem]">
                        <Display>Pricing based on when you need it.</Display>
                    </h2>

                    {/* All Products */}
                    <div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
                        {/* Speaking Premium */}
                        {LANDING_PRICING_TIERS.map((tier) => (
                            <div
                                key={tier.key}
                                className="flex h-full flex-col rounded-lg border border-[#E2E2E2] bg-white p-5 text-center sm:p-6"
                            >
                                <h4 className="text-sm font-semibold text-[#0B0B0F]">
                                    {tier.title}
                                </h4>
                                <p className="mt-2 text-sm text-[#5c5c6a]">
                                    {tier.tagline}
                                </p>
                                <p className="mt-4">
                                    <Display className="text-2xl font-semibold">
                                        {formatRs(tier.amount, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </Display>
                                </p>
                                <p className="mt-2 text-xs text-[#5c5c6a]">
                                    Score + Recording + Analysis Report + Verbal Q&A
                                </p>
                                <div className="mt-6 flex-1" aria-hidden />
                                <Link
                                    href="/login"
                                    className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                                    style={{ backgroundColor: accent }}
                                >
                                    Select
                                </Link>
                            </div>
                        ))}

                        {/* Writing + Combo centered */}
                        <div className="col-span-full mt-4 flex flex-wrap justify-center gap-6 md:gap-8">
                            <div
                                className="w-full md:flex-1 md:max-w-xs flex flex-col rounded-lg border border-[#E2E2E2] bg-white p-5 text-center sm:p-6"
                            >
                                <h4 className="text-sm font-semibold text-[#0B0B0F]">
                                    Writing Evaluation (Premium)
                                </h4>
                                <p className="mt-4">
                                    <Display className="text-2xl font-semibold">
                                        {formatRs(800, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </Display>
                                </p>
                                <p className="mt-2 text-xs text-[#5c5c6a]">
                                    Score + word-level feedback + detailed rubric analysis
                                </p>
                                <div className="mt-6 flex-1" aria-hidden />
                                <Link
                                    href="/login"
                                    className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                                    style={{ backgroundColor: accent }}
                                >
                                    Select
                                </Link>
                            </div>

                            <div
                                className="w-full md:flex-1 md:max-w-xs flex flex-col rounded-lg border border-[#E2E2E2] bg-white p-5 text-center sm:p-6"
                            >
                                <h4 className="text-sm font-semibold text-[#0B0B0F]">
                                    Combo Premium
                                </h4>
                                <p className="mt-4">
                                    <Display className="text-2xl font-semibold">
                                        {formatRs(2000, {
                                            minimumFractionDigits: 0,
                                            maximumFractionDigits: 0,
                                        })}
                                    </Display>
                                </p>
                                <p className="mt-2 text-xs text-[#5c5c6a]">
                                    Speaking Premium + Writing Premium
                                </p>
                                <div className="mt-6 flex-1" aria-hidden />
                                <Link
                                    href="/login"
                                    className="inline-flex w-full items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                                    style={{ backgroundColor: accent }}
                                >
                                    Select
                                </Link>
                            </div>
                        </div>
                    </div>

                    {/* Note */}
                    <p className="mt-8 text-center text-sm text-[#666666]">
                        All prices in NPR. Fonepay payment accepted.
                    </p>
                </div>
            </section>

            {/* Facebook CTA */}
            <section
                className="px-4 py-15 sm:px-6 sm:py-20"
                style={{ backgroundColor: light }}
            >
                <div className="mx-auto max-w-6xl text-center">
                    <h2 className="text-xl font-semibold sm:text-2xl">
                        <Display>Read this before you book another mock test.</Display>
                    </h2>
                    <Link
                        href="https://www.facebook.com/profile.php?id=61570760185512"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-6 inline-block text-base transition hover:underline"
                        style={{ color: accent }}
                    >
                        Follow us on Facebook →
                    </Link>
                </div>
            </section>

            {/* Testimonials — hidden for now, ready for future content */}
            {/*
            <section className="bg-white px-4 py-15 sm:px-6 sm:py-20">
                <div className="mx-auto max-w-6xl text-center">
                    <h2 className="text-xl font-semibold sm:text-2xl">
                        <Display>What students say</Display>
                    </h2>
                    <p className="mt-6 text-base italic text-[#999999]">
                        (Testimonials coming soon...)
                    </p>
                </div>
            </section>
            */}

            {/* Footer */}
            <footer className="bg-white px-4 py-12 sm:px-6 sm:py-14">
                <div className="mx-auto grid max-w-6xl gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
                    <div>
                        <Link
                            href="/"
                            className="text-lg font-semibold"
                            style={{ color: accent }}
                        >
                            ScoreMirror
                        </Link>
                        <p className="mt-3 max-w-xs text-sm leading-relaxed text-[#5c5c6a]">
                            Human-led speaking and writing evaluation for IELTS.
                            Honest feedback. Unfiltered.
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
                            <Link href="/speaking-evaluation" className="hover:opacity-80">
                                Speaking Evaluation
                            </Link>
                            <Link href="/writing-evaluation" className="hover:opacity-80">
                                Writing Evaluation
                            </Link>
                        </nav>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
                            Legal
                        </p>
                        <nav
                            className="mt-4 flex flex-col gap-2 text-sm text-[#3d3d4a]"
                            aria-label="Legal"
                        >
                            <Link href="/terms-conditions" className="hover:opacity-80">
                                Terms &amp; Conditions
                            </Link>
                            <Link href="/privacy-policy" className="hover:opacity-80">
                                Privacy Policy
                            </Link>
                        </nav>
                    </div>
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-[#888]">
                            Socials
                        </p>
                        <nav
                            className="mt-4 flex flex-col gap-2 text-sm text-[#3d3d4a]"
                            aria-label="Socials"
                        >
                            <Link
                                href="https://www.facebook.com/profile.php?id=61570760185512"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 hover:opacity-80"
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
                                </svg>
                                Facebook
                            </Link>
                        </nav>
                    </div>
                </div>
                <p className="mx-auto mt-10 max-w-6xl border-t border-black/[0.06] pt-8 text-center text-sm text-[#9a9aaa]">
                    © 2026 ScoreMirror. All rights reserved.
                </p>
            </footer>
        </div>
    );
}
