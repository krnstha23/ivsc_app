"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldGroup,
    FieldLabel,
    FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard";
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    useEffect(() => {
        if (searchParams.get("registered") === "1") {
            toast.success("Account created. You can sign in now.");
            router.replace("/login", { scroll: false });
        }
    }, [searchParams, router]);

    async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setPending(true);
        const form = e.currentTarget;
        const formData = new FormData(form);
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;

        const result = await signIn("credentials", {
            username: username?.trim(),
            password,
            redirect: false,
        });

        setPending(false);
        if (result?.error) {
            const message = "Invalid username or password.";
            setError(message);
            toast.error(message);
            return;
        }
        if (result?.ok) {
            router.push(callbackUrl);
            router.refresh();
            return;
        }
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader className="text-center">
                    <CardTitle className="text-xl">Welcome back</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={onSubmit}>
                        <FieldGroup>
                            <Field>
                                <FieldLabel htmlFor="username">
                                    Username
                                </FieldLabel>
                                <Input
                                    id="username"
                                    name="username"
                                    type="text"
                                    placeholder="Your username"
                                    required
                                    autoComplete="username"
                                    disabled={pending}
                                />
                            </Field>
                            <Field>
                                <div className="flex items-center">
                                    <FieldLabel htmlFor="password">
                                        Password
                                    </FieldLabel>
                                    <a
                                        href="#"
                                        className="ml-auto text-[10px] underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <Input
                                    id="password"
                                    name="password"
                                    type="password"
                                    required
                                    autoComplete="current-password"
                                    disabled={pending}
                                />
                            </Field>
                            {error && (
                                <p
                                    className="text-sm text-destructive"
                                    role="alert"
                                >
                                    {error}
                                </p>
                            )}
                            <Field>
                                <Button type="submit" disabled={pending}>
                                    {pending ? "Signing in…" : "Sign in"}
                                </Button>
                            </Field>
                        </FieldGroup>
                    </form>
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <Link
                            href="/register"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            Sign up
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
