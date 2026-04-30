"use client"

import { Suspense } from "react";
import Link from "next/link";
import { LayersMinimalistic } from "@solar-icons/react";

import { RegisterForm } from "@/components/register-form";

export default function RegisterPage() {
    return (
        <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
            <div className="flex w-full max-w-sm flex-col gap-6">
                <Link
                    href="/"
                    className="flex flex-col items-center gap-2 self-center font-medium"
                >
                    <div className="flex items-center gap-2">
                        <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
                            <LayersMinimalistic size={16} className="size-4" />
                        </div>
                        ScoreMirror
                    </div>
                    <p className="text-center text-sm text-gray-500 italic">
                        Create an account to book your evaluation. No spam. No hidden fees. Your feedback will be securely stored in your dashboard - not lost in an email inbox.*
                    </p>
                </Link>
                <Suspense
                    fallback={
                        <div className="text-muted-foreground text-center">
                            Loading…
                        </div>
                    }
                >
                    <RegisterForm />
                </Suspense>
            </div>
        </div>
    );
}
