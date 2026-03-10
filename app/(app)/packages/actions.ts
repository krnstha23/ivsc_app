"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import { createBundleSchema, createPackageSchema, createBookingSchema, firstError } from "@/lib/validations";
import { Role as AuthRole } from "@/app/generated/prisma/enums";

function toUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function nextUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1));
}

/** Parse "HH:MM" to minutes since midnight; used to compute duration. */
function timeToMinutes(timeStr: string): number {
    const [h, m] = timeStr.split(":").map(Number);
    return (h ?? 0) * 60 + (m ?? 0);
}

export async function createPackage(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const raw = {
        name: (formData.get("name") as string) ?? "",
        description: ((formData.get("description") as string) ?? "").trim() || null,
        price: formData.get("price") as string,
        isActive: (formData.get("isActive") as string) !== "false",
    };

    const parsed = createPackageSchema.safeParse(raw);
    if (!parsed.success) {
        redirect(`/packages/new?error=${encodeURIComponent(firstError(parsed.error))}`);
    }

    await prisma.package.create({
        data: {
            name: parsed.data.name.trim(),
            description: parsed.data.description?.trim() || null,
            price: parsed.data.price,
            isActive: parsed.data.isActive,
        },
    });

    revalidatePath("/packages");
    redirect("/packages");
}

export async function updatePackage(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const id = formData.get("id");
    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
        redirect(`/packages?error=invalid_package`);
    }

    const raw = {
        name: (formData.get("name") as string) ?? "",
        description: ((formData.get("description") as string) ?? "").trim() || null,
        price: formData.get("price") as string,
        isActive: (formData.get("isActive") as string) !== "false",
    };

    const parsed = createPackageSchema.safeParse(raw);
    if (!parsed.success) {
        redirect(
            `/packages/${idParsed.data}/edit?error=${encodeURIComponent(firstError(parsed.error))}`,
        );
    }

    await prisma.package.update({
        where: { id: idParsed.data },
        data: {
            name: parsed.data.name.trim(),
            description: parsed.data.description?.trim() || null,
            price: parsed.data.price,
            isActive: parsed.data.isActive,
        },
    });

    revalidatePath("/packages");
    redirect("/packages");
}

export async function deletePackage(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const id = formData.get("id");
    const idParsed = z.string().uuid().safeParse(id);
    if (!idParsed.success) {
        redirect(`/packages?error=invalid_package`);
    }

    const packageId = idParsed.data;

    const [bookingCount, historyCount] = await Promise.all([
        prisma.booking.count({ where: { packageId } }),
        prisma.classMetadata.count({ where: { packageId } }),
    ]);

    if (bookingCount > 0 || historyCount > 0) {
        redirect(
            `/packages?error=${encodeURIComponent(
                "Cannot delete a package that has bookings or class history.",
            )}`,
        );
    }

    try {
        await prisma.package.delete({ where: { id: packageId } });
    } catch {
        redirect(
            `/packages?error=${encodeURIComponent(
                "Failed to delete package. It may be referenced by other records.",
            )}`,
        );
    }

    revalidatePath("/packages");
    redirect("/packages");
}

export async function deletePackageBundle(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const bundleId = formData.get("bundleId");
    const parsed = z.string().uuid().safeParse(bundleId);
    if (!parsed.success) {
        redirect("/packages?error=invalid_bundle");
    }

    await prisma.packageBundle.delete({
        where: { id: parsed.data },
    });

    revalidatePath("/packages");
    redirect("/packages");
}

export type UpdatePackageBundleResult =
    | { success: true }
    | { success: false; error: string };

export async function updatePackageBundle(payload: {
    bundleId: string;
    isActive: boolean;
    packageIds: string[];
}): Promise<UpdatePackageBundleResult> {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        return { success: false, error: "Not authorized." };
    }

    const schema = z.object({
        bundleId: z.string().uuid(),
        isActive: z.boolean(),
        packageIds: z.array(z.string().uuid()),
    });

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const uniquePackageIds = Array.from(new Set(parsed.data.packageIds));

    await prisma.packageBundle.update({
        where: { id: parsed.data.bundleId },
        data: {
            isActive: parsed.data.isActive,
            packageIds: uniquePackageIds,
        },
    });

    revalidatePath("/packages");
    return { success: true };
}

export async function createPackageBundle(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const packageIds = formData
        .getAll("packageIds")
        .map((v) => String(v))
        .filter(Boolean);

    const raw = {
        name: (formData.get("name") as string) ?? "",
        description: ((formData.get("description") as string) ?? "").trim() || null,
        price: formData.get("price") as string,
        discountPercent: ((formData.get("discountPercent") as string) ?? "").trim() || null,
        isActive: (formData.get("isActive") as string) !== "false",
        packageIds,
    };

    const parsed = createBundleSchema.safeParse(raw);
    if (!parsed.success) {
        redirect(
            `/packages/bundles/new?error=${encodeURIComponent(firstError(parsed.error))}`,
        );
    }

    await prisma.packageBundle.create({
        data: {
            name: parsed.data.name.trim(),
            description: parsed.data.description?.trim() || null,
            price: parsed.data.price,
            discountPercent: parsed.data.discountPercent ?? null,
            isActive: parsed.data.isActive,
            packageIds: Array.from(new Set(parsed.data.packageIds)),
        },
    });

    revalidatePath("/packages");
    redirect("/packages");
}

export async function updatePackageBundleDetails(formData: FormData) {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role as
        | Role
        | undefined;
    if (!canAccess(role, ["ADMIN"])) {
        redirect("/dashboard");
    }

    const bundleId = formData.get("bundleId");
    const idParsed = z.string().uuid().safeParse(bundleId);
    if (!idParsed.success) {
        redirect(`/packages?error=invalid_bundle`);
    }

    const packageIds = formData
        .getAll("packageIds")
        .map((v) => String(v))
        .filter(Boolean);

    const raw = {
        name: (formData.get("name") as string) ?? "",
        description: ((formData.get("description") as string) ?? "").trim() || null,
        price: formData.get("price") as string,
        discountPercent:
            ((formData.get("discountPercent") as string) ?? "").trim() || null,
        isActive: (formData.get("isActive") as string) !== "false",
        packageIds,
    };

    const parsed = createBundleSchema.safeParse(raw);
    if (!parsed.success) {
        redirect(
            `/packages/bundles/${idParsed.data}/edit?error=${encodeURIComponent(firstError(parsed.error))}`,
        );
    }

    await prisma.packageBundle.update({
        where: { id: idParsed.data },
        data: {
            name: parsed.data.name.trim(),
            description: parsed.data.description?.trim() || null,
            price: parsed.data.price,
            discountPercent: parsed.data.discountPercent ?? null,
            isActive: parsed.data.isActive,
            packageIds: Array.from(new Set(parsed.data.packageIds)),
        },
    });

    revalidatePath("/packages");
    redirect("/packages");
}

// ---------------------------------------------------------------------------
// Booking (package-first flow)
// ---------------------------------------------------------------------------

export type AvailableSlot = {
    id: string;
    teacherId: string;
    teacherName: string;
    date: string;
    startTime: string;
    endTime: string;
    durationMinutes: number;
};

/** Returns bookable availability slots for a package in the given date range. */
export async function getAvailableSlotsForPackage(
    packageId: string,
    startDate: Date,
    endDate: Date
): Promise<AvailableSlot[]> {
    const session = await auth();
    if (!session?.user) return [];

    const start = toUtcDateOnly(startDate);
    const end = nextUtcDateOnly(endDate);

    const slots = await prisma.availability.findMany({
        where: {
            date: { gte: start, lt: end },
            teacher: {
                packages: { some: { packageId } },
            },
            booking: null,
        },
        select: {
            id: true,
            startTime: true,
            endTime: true,
            date: true,
            teacherId: true,
            teacher: {
                select: {
                    user: {
                        select: {
                            firstName: true,
                            middleName: true,
                            lastName: true,
                        },
                    },
                },
            },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    return slots.map((s) => {
        const durationMinutes =
            timeToMinutes(s.endTime) - timeToMinutes(s.startTime);
        return {
            id: s.id,
            teacherId: s.teacherId,
            teacherName: [
                s.teacher.user.firstName,
                s.teacher.user.middleName,
                s.teacher.user.lastName,
            ]
                .filter(Boolean)
                .join(" ")
                .trim() || "Teacher",
            date: s.date.toISOString().slice(0, 10),
            startTime: s.startTime,
            endTime: s.endTime,
            durationMinutes,
        };
    });
}

export type EnrollmentForPackageResult = {
    enrollmentId: string;
    classesTotal: number;
    classesUsed: number;
    classesRemaining: number;
} | null;

/** Returns current user's active enrollment for a package (if any). */
export async function getEnrollmentForPackage(
    packageId: string
): Promise<EnrollmentForPackageResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return null;

    const student = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!student) return null;

    const enrollment = await prisma.studentEnrollment.findUnique({
        where: {
            studentId_packageId: { studentId: student.id, packageId },
        },
        select: {
            id: true,
            classesTotal: true,
            classesUsed: true,
            status: true,
        },
    });
    if (
        !enrollment ||
        enrollment.status !== "ACTIVE" ||
        enrollment.classesUsed >= enrollment.classesTotal
    )
        return null;

    return {
        enrollmentId: enrollment.id,
        classesTotal: enrollment.classesTotal,
        classesUsed: enrollment.classesUsed,
        classesRemaining: enrollment.classesTotal - enrollment.classesUsed,
    };
}

export type CreateBookingResult =
    | { success: true }
    | { success: false; error: string };

/** Creates a booking and deducts one class from the student's enrollment. */
export async function createBooking(payload: {
    availabilityId: string;
    packageId: string;
}): Promise<CreateBookingResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;

    if (!userId) return { success: false, error: "You must be signed in." };
    if (role !== AuthRole.USER) {
        return { success: false, error: "Only students can book sessions." };
    }

    const parsed = createBookingSchema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { availabilityId, packageId } = parsed.data;

    const student = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!student) {
        return { success: false, error: "Student profile not found." };
    }

    const enrollment = await prisma.studentEnrollment.findUnique({
        where: {
            studentId_packageId: { studentId: student.id, packageId },
        },
        select: { id: true, classesTotal: true, classesUsed: true, status: true },
    });
    if (!enrollment || enrollment.status !== "ACTIVE") {
        return { success: false, error: "You are not enrolled in this package." };
    }
    if (enrollment.classesUsed >= enrollment.classesTotal) {
        return { success: false, error: "No classes remaining in this package." };
    }

    const availability = await prisma.availability.findUnique({
        where: { id: availabilityId },
        select: {
            id: true,
            teacherId: true,
            date: true,
            startTime: true,
            endTime: true,
            booking: { select: { id: true } },
        },
    });
    if (!availability) {
        return { success: false, error: "This time slot is no longer available." };
    }
    if (availability.booking) {
        return { success: false, error: "This slot is already booked." };
    }

    const teacherHasPackage = await prisma.teacherPackage.findUnique({
        where: {
            teacherId_packageId: {
                teacherId: availability.teacherId,
                packageId,
            },
        },
    });
    if (!teacherHasPackage) {
        return { success: false, error: "This teacher does not offer this package." };
    }

    const durationMinutes =
        timeToMinutes(availability.endTime) - timeToMinutes(availability.startTime);
    const scheduledAt = new Date(
        `${availability.date.toISOString().slice(0, 10)}T${availability.startTime}:00.000Z`
    );

    await prisma.$transaction([
        prisma.booking.create({
            data: {
                userId,
                teacherId: availability.teacherId,
                availabilityId: availability.id,
                packageId,
                scheduledAt,
                duration: durationMinutes,
                status: "CONFIRMED",
            },
        }),
        prisma.studentEnrollment.update({
            where: { id: enrollment.id },
            data: { classesUsed: { increment: 1 } },
        }),
    ]);

    revalidatePath("/packages");
    revalidatePath(`/packages/${packageId}`);
    return { success: true };
}

