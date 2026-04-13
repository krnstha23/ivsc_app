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
import { Eye, EyeClosed } from "@solar-icons/react";
import { Field, FieldGroup } from "@/components/ui/field";
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
    const [usernameFocused, setUsernameFocused] = useState(false);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [usernameValue, setUsernameValue] = useState("");
    const [passwordValue, setPasswordValue] = useState("");
    const [passwordVisible, setPasswordVisible] = useState(false);

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
                                <div className="relative rounded-md border border-input shadow-xs">
                                    <span
                                        className={cn(
                                            "pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-card px-1.5 text-sm text-muted-foreground transition-all duration-[240ms] ease-out",
                                            usernameFocused || usernameValue
                                                ? "opacity-100"
                                                : "top-1/2 -translate-y-1/2 opacity-0"
                                        )}
                                        aria-hidden
                                    >
                                        Username
                                    </span>
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder={
                                            usernameFocused || usernameValue
                                                ? ""
                                                : "Username"
                                        }
                                        required
                                        autoComplete="username"
                                        disabled={pending}
                                        value={usernameValue}
                                        onChange={(e) =>
                                            setUsernameValue(e.target.value)
                                        }
                                        onFocus={() => setUsernameFocused(true)}
                                        onBlur={() => {
                                            setUsernameFocused(false);
                                        }}
                                        className="border-0 text-xs shadow-none placeholder:text-xs transition-all duration-[240ms] focus-visible:ring-0"
                                    />
                                </div>
                            </Field>
                            <Field>
                                <div className="flex items-center justify-end">
                                    <a
                                        href="#"
                                        className="text-muted-foreground text-[10px] underline-offset-4 hover:underline"
                                    >
                                        Forgot your password?
                                    </a>
                                </div>
                                <div className="relative rounded-md border border-input shadow-xs">
                                    <span
                                        className={cn(
                                            "pointer-events-none absolute left-3 top-0 -translate-y-1/2 bg-card px-1.5 text-sm text-muted-foreground transition-all duration-[240ms] ease-out",
                                            passwordFocused || passwordValue
                                                ? "opacity-100"
                                                : "top-1/2 -translate-y-1/2 opacity-0"
                                        )}
                                        aria-hidden
                                    >
                                        Password
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPasswordVisible((v) => !v)
                                        }
                                        className="text-muted-foreground hover:text-foreground absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded p-0.5 transition-colors focus:outline-none"
                                        aria-label={
                                            passwordVisible
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {passwordVisible ? (
                                            <EyeClosed size={18} />
                                        ) : (
                                            <Eye size={18} />
                                        )}
                                    </button>
                                    <Input
                                        id="password"
                                        name="password"
                                        type={
                                            passwordVisible ? "text" : "password"
                                        }
                                        placeholder={
                                            passwordFocused || passwordValue
                                                ? ""
                                                : "Password"
                                        }
                                        required
                                        autoComplete="current-password"
                                        disabled={pending}
                                        value={passwordValue}
                                        onChange={(e) =>
                                            setPasswordValue(e.target.value)
                                        }
                                        onFocus={() => setPasswordFocused(true)}
                                        onBlur={() => {
                                            setPasswordFocused(false);
                                        }}
                                        className="border-0 pr-10 text-xs shadow-none placeholder:text-xs transition-all duration-[240ms] focus-visible:ring-0"
                                    />
                                </div>
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
