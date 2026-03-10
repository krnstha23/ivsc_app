"use client";

import * as React from "react";

const PROGRESS_DATA = [
    { label: "Bookings", value: 12, percent: 60 },
    { label: "Sessions", value: 8, percent: 40 },
    { label: "Packages", value: 4, percent: 20 },
    { label: "Availability", value: 20, percent: 100 },
] as const;

type Phase = "idle" | "fill" | "settle";

export function ProgressBarsSection() {
    const titleRef = React.useRef<HTMLHeadingElement>(null);
    const [phase, setPhase] = React.useState<Phase>("idle");
    const hasTriggered = React.useRef(false);

    React.useEffect(() => {
        const el = titleRef.current;
        if (!el) return;

        const observer = new IntersectionObserver(
            (entries) => {
                const [entry] = entries;
                if (!entry.isIntersecting || hasTriggered.current) return;
                hasTriggered.current = true;
                setPhase("fill");
            },
            { threshold: 0.5, rootMargin: "0px" }
        );

        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    React.useEffect(() => {
        if (phase !== "fill") return;
        const t = setTimeout(() => setPhase("settle"), 600);
        return () => clearTimeout(t);
    }, [phase]);

    const barTransition =
        phase === "fill"
            ? "width 0.6s ease-out"
            : phase === "settle"
              ? "width 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)"
              : "none";

    const getWidth = (percent: number) => {
        if (phase === "idle") return 0;
        if (phase === "fill") return 100;
        return percent;
    };

    return (
        <section className="px-4 py-12 sm:px-6 sm:py-16">
            <div className="container mx-auto max-w-6xl">
                <h2
                    ref={titleRef}
                    className="text-center text-2xl font-bold text-foreground sm:text-3xl"
                >
                    Understand your schedule clearly
                </h2>
                <div className="border-border bg-card mx-auto mt-10 max-w-2xl rounded-lg border p-6 shadow-sm">
                    <p className="font-semibold text-foreground">Overview</p>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Your bookings and remaining classes at a glance.
                    </p>
                    <div className="mt-6 space-y-4">
                        {PROGRESS_DATA.map(({ label, value, percent }) => (
                            <div key={label}>
                                <div className="flex justify-between text-sm">
                                    <span className="text-foreground font-medium">
                                        {label}
                                    </span>
                                    <span className="text-muted-foreground tabular-nums">
                                        {value}
                                    </span>
                                </div>
                                <div className="bg-muted mt-1 h-2 w-full overflow-hidden rounded-full">
                                    <div
                                        className="bg-primary h-full rounded-full origin-left"
                                        style={{
                                            width: `${getWidth(percent)}%`,
                                            transition: barTransition,
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                    <p className="text-muted-foreground mt-4 text-sm">
                        View your dashboard after you sign in.
                    </p>
                </div>
            </div>
        </section>
    );
}
