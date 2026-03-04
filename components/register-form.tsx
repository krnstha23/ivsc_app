"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "@solar-icons/react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { createAccount } from "@/app/register/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
    UserTypeSelect,
    type UserType,
} from "@/components/register-user-type-select";

type Step = "details" | "userType" | "password";

const initialDetails = {
    username: "",
    firstName: "",
    middleName: "",
    lastName: "",
    phone: "",
    email: "",
};

const initialUserType: UserType = "student";

const initialPasswords = {
    password: "",
    confirmPassword: "",
};

export function RegisterForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const [step, setStep] = useState<Step>("details");
    const [details, setDetails] = useState(initialDetails);
    const [userType, setUserType] = useState<UserType>(initialUserType);
    const [passwords, setPasswords] = useState(initialPasswords);
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    function handleDetailsChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setDetails((prev) => ({ ...prev, [name]: value }));
        setError(null);
    }

    function handlePasswordChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setPasswords((prev) => ({ ...prev, [name]: value }));
        setError(null);
    }

    function onDetailsSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setStep("userType");
    }

    function onUserTypeSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        setStep("password");
    }

    async function onPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setError(null);
        if (passwords.password !== passwords.confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        if (passwords.password.length < 8) {
            setError("Password must be at least 8 characters.");
            return;
        }
        setPending(true);
        const result = await createAccount({
            username: details.username,
            firstName: details.firstName,
            middleName: details.middleName || null,
            lastName: details.lastName,
            phone: details.phone || null,
            email: details.email,
            userType,
            password: passwords.password,
        });
        setPending(false);
        if (result.success) {
            return;
        }
        setError(result.error);
        toast.error(result.error);
    }

    function goBack() {
        setError(null);
        if (step === "password") setStep("userType");
        else if (step === "userType") setStep("details");
    }

    return (
        <div className={cn("flex flex-col gap-6", className)} {...props}>
            <Card>
                <CardHeader
                    className={cn(
                        (step === "userType" || step === "password") &&
                            "flex flex-row items-center gap-2",
                    )}
                >
                    {(step === "userType" || step === "password") && (
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={goBack}
                            disabled={pending}
                            aria-label="Back"
                        >
                            <ArrowLeft size={20} className="size-5" />
                        </Button>
                    )}
                    <CardTitle
                        className={cn(
                            "text-xl",
                            step === "details" && "text-center",
                            (step === "userType" || step === "password") &&
                                "flex-1",
                        )}
                    >
                        {step === "details"
                            ? "Create an account"
                            : step === "userType"
                              ? "User type"
                              : "Choose a password"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {step === "details" ? (
                        <form onSubmit={onDetailsSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="firstName">
                                        First name
                                    </FieldLabel>
                                    <Input
                                        id="firstName"
                                        name="firstName"
                                        type="text"
                                        placeholder="First name"
                                        required
                                        autoComplete="given-name"
                                        value={details.firstName}
                                        onChange={handleDetailsChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="middleName">
                                        Middle name
                                    </FieldLabel>
                                    <Input
                                        id="middleName"
                                        name="middleName"
                                        type="text"
                                        placeholder="Middle name (optional)"
                                        autoComplete="additional-name"
                                        value={details.middleName}
                                        onChange={handleDetailsChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="lastName">
                                        Last name
                                    </FieldLabel>
                                    <Input
                                        id="lastName"
                                        name="lastName"
                                        type="text"
                                        placeholder="Last name"
                                        required
                                        autoComplete="family-name"
                                        value={details.lastName}
                                        onChange={handleDetailsChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="phone">
                                        Phone number
                                    </FieldLabel>
                                    <Input
                                        id="phone"
                                        name="phone"
                                        type="tel"
                                        placeholder="Phone number"
                                        required
                                        autoComplete="tel"
                                        value={details.phone}
                                        onChange={handleDetailsChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="email">
                                        Email
                                    </FieldLabel>
                                    <Input
                                        id="email"
                                        name="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        required
                                        autoComplete="email"
                                        value={details.email}
                                        onChange={handleDetailsChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="username">
                                        Username
                                    </FieldLabel>
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        placeholder="Choose a username"
                                        required
                                        autoComplete="username"
                                        value={details.username}
                                        onChange={handleDetailsChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <Button type="submit" disabled={pending}>
                                        Next
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </form>
                    ) : step === "userType" ? (
                        <form onSubmit={onUserTypeSubmit}>
                            <FieldGroup>
                                <UserTypeSelect
                                    value={userType}
                                    onChange={setUserType}
                                    disabled={pending}
                                />
                                <Field>
                                    <Button type="submit" disabled={pending}>
                                        Next
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </form>
                    ) : (
                        <form onSubmit={onPasswordSubmit}>
                            <FieldGroup>
                                <Field>
                                    <FieldLabel htmlFor="password">
                                        Password
                                    </FieldLabel>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        placeholder="At least 8 characters"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        value={passwords.password}
                                        onChange={handlePasswordChange}
                                        disabled={pending}
                                    />
                                </Field>
                                <Field>
                                    <FieldLabel htmlFor="confirmPassword">
                                        Confirm password
                                    </FieldLabel>
                                    <Input
                                        id="confirmPassword"
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Confirm your password"
                                        required
                                        minLength={8}
                                        autoComplete="new-password"
                                        value={passwords.confirmPassword}
                                        onChange={handlePasswordChange}
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
                                        {pending
                                            ? "Creating account…"
                                            : "Create account"}
                                    </Button>
                                </Field>
                            </FieldGroup>
                        </form>
                    )}
                    <p className="mt-4 text-center text-sm text-muted-foreground">
                        Already have an account?{" "}
                        <Link
                            href="/login"
                            className="font-medium text-primary underline-offset-4 hover:underline"
                        >
                            Sign in
                        </Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
