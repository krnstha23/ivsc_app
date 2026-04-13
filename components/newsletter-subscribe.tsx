"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function NewsletterSubscribe() {
    const [email, setEmail] = useState("");

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!email.trim()) return;
        toast.success("Thanks for subscribing! We'll be in touch.");
        setEmail("");
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="flex flex-col gap-3 sm:flex-row sm:items-center"
        >
            <Input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-w-0 rounded-lg border border-input bg-background px-4 py-2.5 sm:min-w-[220px]"
                aria-label="Email for newsletter"
            />
            <Button
                type="submit"
                className="rounded-lg px-5 py-2.5"
            >
                Subscribe
            </Button>
        </form>
    );
}
