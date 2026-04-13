import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LandingHeader } from "@/components/landing-header";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
    title: "ScoreMirror – Computer-Based IELTS Mock Tests",
    description:
        "Walk into your IELTS exam already familiar with it. Full computer-based mock tests, human review, and performance reports.",
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

function WritingFeedbackMock() {
    return (
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_25px_60px_-15px_rgba(15,15,25,0.25)]">
            <div
                className="flex items-center justify-between border-b border-black/[0.06] px-4 py-3"
                style={{ backgroundColor: `${accent}0f` }}
            >
                <span className="text-xs font-bold text-[#222]">
                    Writing Task 2 · Feedback
                </span>
                <span
                    className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: accent }}
                >
                    Reviewed
                </span>
            </div>
            <div className="grid gap-3 p-4 sm:grid-cols-[1fr_11rem]">
                <div className="min-h-[140px] rounded-xl border border-black/[0.06] bg-[#fafafa] p-3 text-[11px] leading-relaxed text-[#333]">
                    <p>
                        <mark
                            className="rounded px-0.5"
                            style={{ backgroundColor: `${accent}33` }}
                        >
                            Governments should invest
                        </mark>{" "}
                        more in public transport to reduce congestion in cities…
                    </p>
                </div>
                <div className="flex flex-col gap-2">
                    {(
                        [
                            ["Grammar", "Article use; tense consistency"],
                            ["Cohesion", "Linking words in paragraph 2"],
                            ["Vocab", "Academic collocations"],
                        ] as const
                    ).map(([title, note]) => (
                        <div
                            key={title}
                            className="rounded-lg border border-black/[0.06] bg-white p-2.5 shadow-sm"
                        >
                            <p
                                className="text-[10px] font-bold"
                                style={{ color: accent }}
                            >
                                {title}
                            </p>
                            <p className="mt-0.5 text-[10px] text-[#555]">
                                {note}
                            </p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function ReportMock() {
    return (
        <div className="overflow-hidden rounded-2xl border border-black/[0.06] bg-white shadow-[0_25px_60px_-15px_rgba(15,15,25,0.25)]">
            <div className="border-b border-black/[0.06] bg-[#f8f8fa] px-4 py-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#666]">
                    Performance report
                </p>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                    <Display className="text-3xl font-semibold text-[#111]">
                        6.5
                    </Display>
                    <span className="text-xs font-medium text-[#555]">
                        Competent user
                    </span>
                </div>
            </div>
            <div className="space-y-4 p-4">
                {(
                    [
                        ["Listening", 82],
                        ["Reading", 70],
                        ["Writing", 65],
                        ["Speaking", 74],
                    ] as const
                ).map(([skill, pct]) => (
                    <div key={skill}>
                        <div className="flex justify-between text-[10px] font-semibold text-[#444]">
                            <span>{skill}</span>
                            <span>{pct}%</span>
                        </div>
                        <div className="mt-1 h-2 overflow-hidden rounded-full bg-[#eee]">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    width: `${pct}%`,
                                    backgroundColor: accent,
                                }}
                            />
                        </div>
                    </div>
                ))}
                <div className="rounded-lg border border-black/[0.06] bg-[#fafafa] p-3">
                    <p className="text-[9px] font-bold uppercase text-[#888]">
                        Score trend
                    </p>
                    <div className="mt-2 flex h-12 items-end gap-1">
                        {[40, 55, 48, 62, 58, 70, 65].map((h, i) => (
                            <div
                                key={i}
                                className="flex-1 rounded-t-sm opacity-90"
                                style={{
                                    height: `${h}%`,
                                    backgroundColor: accent,
                                }}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
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
                        <p
                            className="mb-5 inline-flex rounded-full px-3.5 py-1.5 text-xs font-medium text-white sm:text-[13px]"
                            style={{ backgroundColor: `${accent}cc` }}
                        >
                            Computer-Based IELTS — Academic &amp; General
                        </p>
                        <h1 className="text-[1.75rem] font-normal leading-[1.15] tracking-tight text-white sm:text-4xl md:text-[2.75rem] md:leading-[1.12]">
                            <Display>
                                Walk into your IELTS exam{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    already familiar
                                </em>{" "}
                                with it.
                            </Display>
                        </h1>
                        <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base lg:mx-0 mx-auto">
                            Practice in a timed, computer-delivered environment
                            that mirrors the real test — so pacing, navigation,
                            and focus feel second nature.
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
                                Preview the experience
                            </Link>
                        </div>
                        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:justify-start">
                            <div className="flex -space-x-2.5">
                                {[
                                    "#a78bfa",
                                    "#818cf8",
                                    "#c084fc",
                                    "#22d3ee",
                                ].map((c, i) => (
                                    <span
                                        key={i}
                                        className="inline-flex size-9 items-center justify-center rounded-full border-2 border-[#0B0B0F] text-[10px] font-bold text-white"
                                        style={{ backgroundColor: c }}
                                        aria-hidden
                                    >
                                        {String.fromCharCode(65 + i)}
                                    </span>
                                ))}
                            </div>
                            <p className="max-w-[260px] text-left text-xs text-white/55 sm:max-w-none sm:text-sm">
                                <span className="text-white/85 font-medium">
                                    4,200+ candidates
                                </span>{" "}
                                preparing across Nepal.
                            </p>
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

            {/* Transition quote */}
            <section
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: light }}
            >
                <p className="mx-auto max-w-3xl text-center text-xl leading-snug text-[#1a1a22] sm:text-2xl md:text-3xl md:leading-snug">
                    <Display>
                        You are not practising questions. You are{" "}
                        <em
                            className="font-semibold italic"
                            style={{ color: accent }}
                        >
                            rehearsing the exam.
                        </em>
                    </Display>
                </p>
            </section>

            {/* The Experience */}
            <section
                id="experience"
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: light }}
            >
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="order-2 lg:order-1">
                        <ListeningMock />
                    </div>
                    <div className="order-1 lg:order-2">
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em]"
                            style={{ color: accent }}
                        >
                            The experience
                        </p>
                        <h2 className="mt-3 text-2xl leading-tight text-[#0B0B0F] sm:text-3xl md:text-[2rem] md:leading-tight">
                            <Display>
                                Designed around the{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    real exam experience
                                </em>
                            </Display>
                        </h2>
                        <div className="mt-8 space-y-6 text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
                            <p>
                                <strong className="text-[#0B0B0F]">
                                    Timed sections that respect real
                                    constraints.
                                </strong>{" "}
                                Each part runs on the clock, with navigation and
                                prompts aligned to what you will see on test
                                day.
                            </p>
                            <p>
                                <strong className="text-[#0B0B0F]">
                                    Continuous, distraction-minimised flow.
                                </strong>{" "}
                                Stay inside one coherent interface from
                                listening through to writing, without breaking
                                your focus.
                            </p>
                            <p>
                                <strong className="text-[#0B0B0F]">
                                    Navigation mirrors the official layout.
                                </strong>{" "}
                                Learn where controls live now — so you are never
                                hunting for buttons when it counts.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Human Review */}
            <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 md:py-24">
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="order-1">
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em]"
                            style={{ color: accent }}
                        >
                            Human review
                        </p>
                        <h2 className="mt-3 text-2xl leading-tight text-[#0B0B0F] sm:text-3xl md:text-[2rem] md:leading-tight">
                            <Display>
                                Reviewed by experienced{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    IELTS instructors
                                </em>
                            </Display>
                        </h2>
                        <p className="mt-6 text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
                            Automated scoring can miss nuance. Our instructors
                            comment on task achievement, coherence, grammar, and
                            vocabulary — with actionable notes you can apply on
                            your next attempt.
                        </p>
                        <ul className="mt-8 space-y-4">
                            <CheckLi>
                                Personalised comments tied to band descriptors
                            </CheckLi>
                            <CheckLi>
                                Highlighted patterns in grammar and vocabulary
                            </CheckLi>
                            <CheckLi>
                                Suggested upgrades for cohesion and tone
                            </CheckLi>
                        </ul>
                    </div>
                    <div className="order-2">
                        <WritingFeedbackMock />
                    </div>
                </div>
            </section>

            {/* Performance report */}
            <section className="bg-white px-4 py-16 sm:px-6 sm:py-20 md:py-24">
                <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="order-1">
                        <p
                            className="text-xs font-bold uppercase tracking-[0.2em]"
                            style={{ color: accent }}
                        >
                            Performance report
                        </p>
                        <h2 className="mt-3 text-2xl leading-tight text-[#0B0B0F] sm:text-3xl md:text-[2rem] md:leading-tight">
                            <Display>
                                Understand your{" "}
                                <em
                                    className="font-semibold italic"
                                    style={{ color: accent }}
                                >
                                    performance clearly
                                </em>
                            </Display>
                        </h2>
                        <p className="mt-6 text-[0.9375rem] leading-relaxed text-[#3d3d4a]">
                            See strengths and weak spots at a glance — with
                            overall band, skill breakdowns, and a trend view so
                            you know whether you are improving week to week.
                        </p>
                        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
                            {(
                                [
                                    ["6.5", "Overall"],
                                    ["7.0", "Listening"],
                                    ["6.0", "Writing"],
                                ] as const
                            ).map(([score, label]) => (
                                <div
                                    key={label}
                                    className="rounded-xl border border-black/[0.06] bg-[#fafafa] px-3 py-4 text-center shadow-sm sm:px-4"
                                >
                                    <p
                                        className="text-lg font-semibold text-[#111] sm:text-xl"
                                        style={{
                                            fontFamily:
                                                "var(--font-playfair), serif",
                                        }}
                                    >
                                        {score}
                                    </p>
                                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-[#666] sm:text-[11px]">
                                        {label}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="order-2">
                        <ReportMock />
                    </div>
                </div>
            </section>

            {/* Pricing */}
            <section
                className="px-4 py-16 sm:px-6 sm:py-20 md:py-24"
                style={{ backgroundColor: light }}
            >
                <div className="mx-auto max-w-6xl text-center">
                    <h2 className="text-2xl text-[#0B0B0F] sm:text-3xl md:text-[2rem]">
                        <Display>Simple and transparent</Display>
                    </h2>
                    <p className="mx-auto mt-4 max-w-xl text-sm text-[#5c5c6a] sm:text-base">
                        One full mock. Every section. No surprise add-ons.
                    </p>
                    <div className="mx-auto mt-12 max-w-md rounded-2xl border border-black/[0.06] bg-white px-8 py-10 text-left shadow-[0_24px_60px_-24px_rgba(15,15,25,0.2)] sm:px-10 sm:py-12">
                        <h3 className="text-lg font-bold text-[#0B0B0F]">
                            Full IELTS Mock Test
                        </h3>
                        <p className="mt-4 flex items-baseline gap-2">
                            <span className="text-sm font-medium text-[#5c5c6a]">
                                Rs
                            </span>
                            <Display className="text-5xl font-semibold text-[#0B0B0F]">
                                1200
                            </Display>
                            <span className="text-sm text-[#5c5c6a]">
                                / per test
                            </span>
                        </p>
                        <ul className="mt-8 space-y-4">
                            <CheckLi>All four skills in one sitting</CheckLi>
                            <CheckLi>Computer-delivered interface</CheckLi>
                            <CheckLi>
                                Timed sections and official-style flow
                            </CheckLi>
                            <CheckLi>Human feedback on writing tasks</CheckLi>
                            <CheckLi>Downloadable performance report</CheckLi>
                        </ul>
                        <Link
                            href="/packages"
                            className="mt-10 flex min-h-12 w-full items-center justify-center rounded-2xl text-sm font-semibold text-white transition hover:opacity-95 sm:min-h-[3.25rem]"
                            style={{ backgroundColor: accent }}
                        >
                            Start Mock Test
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
                    </Display>
                </h2>
                <p className="mx-auto mt-5 max-w-lg text-sm text-white/65 sm:text-base">
                    Experience the exam once — everything changes after that.
                </p>
                <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
                    <Link
                        href="/packages"
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl px-8 text-sm font-semibold text-white transition hover:opacity-95"
                        style={{ backgroundColor: accent }}
                    >
                        Start Mock Test
                    </Link>
                    <Link
                        href="#experience"
                        className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/35 px-8 text-sm font-semibold text-white transition hover:bg-white/10"
                    >
                        Preview first
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-black/[0.06] bg-white px-4 py-10 sm:px-6 sm:py-12">
                <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 md:flex-row md:justify-between">
                    <Link
                        href="/"
                        className="text-lg font-semibold"
                        style={{ color: accent }}
                    >
                        ScoreMirror
                    </Link>
                    <nav
                        className="flex flex-wrap items-center justify-center gap-6 text-sm text-[#3d3d4a]"
                        aria-label="Footer"
                    >
                        {footerPages.map((page) => (
                            <Link
                                key={page.slug}
                                href={`/${page.slug}`}
                                className="hover:opacity-80"
                            >
                                {page.title}
                            </Link>
                        ))}
                    </nav>
                    <p className="text-xs text-[#9a9aaa]">
                        © {new Date().getFullYear()} ScoreMirror
                    </p>
                </div>
            </footer>
        </div>
    );
}

