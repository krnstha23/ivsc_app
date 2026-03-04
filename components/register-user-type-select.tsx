"use client";

import { cn } from "@/lib/utils";
import { Field, FieldGroup, FieldLegend, FieldSet } from "@/components/ui/field";

export type UserType = "student" | "teacher";

const options: { value: UserType; label: string }[] = [
    { value: "student", label: "Student" },
    { value: "teacher", label: "Teacher" },
];

export function UserTypeSelect({
    value,
    onChange,
    disabled,
}: {
    value: UserType;
    onChange: (value: UserType) => void;
    disabled?: boolean;
}) {
    return (
        <FieldSet>
            <FieldLegend>Choose your role</FieldLegend>
            <FieldGroup>
                <div
                    className="flex w-full flex-col gap-2"
                    role="radiogroup"
                    aria-label="User type"
                >
                    {options.map((option) => (
                        <label
                            key={option.value}
                            className={cn(
                                "relative flex w-full cursor-pointer select-none items-center justify-center rounded-md border px-4 py-3 text-sm font-medium transition-colors",
                                "hover:bg-accent hover:text-accent-foreground",
                                "focus-within:ring-ring focus-within:ring-2 focus-within:ring-offset-2",
                                "disabled:pointer-events-none disabled:opacity-50",
                                value === option.value
                                    ? "border-primary bg-primary/10 text-primary"
                                    : "border-input bg-background"
                            )}
                        >
                            <input
                                type="radio"
                                name="userType"
                                value={option.value}
                                checked={value === option.value}
                                onChange={() => onChange(option.value)}
                                disabled={disabled}
                                className="sr-only"
                                aria-hidden
                            />
                            <span>{option.label}</span>
                        </label>
                    ))}
                </div>
            </FieldGroup>
        </FieldSet>
    );
}
