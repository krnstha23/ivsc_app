"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import {
    createBundleSchema,
    createPackageSchema,
    cancelBookingSchema,
    firstError,
} from "@/lib/validations";
import { Role as AuthRole } from "@/app/generated/prisma/enums";
import {
    generateSlots,
    computeLeadTimeCategory,
    assignTeacher,
    minutesToTime,
    timeToMinutes,
    type LeadTimeCategory,
} from "@/lib/slot-generator";
import { assignWritingQuestion } from "@/lib/writing-question-assigner";

function toUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

function nextUtcDateOnly(d: Date): Date {
    return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate() + 1));
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
        priceStandard: formData.get("priceStandard") as string,
        pricePriority: formData.get("pricePriority") as string,
        priceInstant: formData.get("priceInstant") as string,
        duration: formData.get("duration") as string,
        hasEvaluation: formData.get("hasEvaluation") === "true",
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
            priceStandard: parsed.data.priceStandard,
            pricePriority: parsed.data.pricePriority,
            priceInstant: parsed.data.priceInstant,
            duration: parsed.data.duration,
            hasEvaluation: parsed.data.hasEvaluation,
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
        priceStandard: formData.get("priceStandard") as string,
        pricePriority: formData.get("pricePriority") as string,
        priceInstant: formData.get("priceInstant") as string,
        duration: formData.get("duration") as string,
        hasEvaluation: formData.get("hasEvaluation") === "true",
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
            priceStandard: parsed.data.priceStandard,
            pricePriority: parsed.data.pricePriority,
            priceInstant: parsed.data.priceInstant,
            duration: parsed.data.duration,
            hasEvaluation: parsed.data.hasEvaluation,
            discountPercent: parsed.data.discountPercent ?? null,
            isActive: parsed.data.isActive,
            packageIds: Array.from(new Set(parsed.data.packageIds)),
        },
    });

    revalidatePath("/packages");
    redirect("/packages");
}

// ---------------------------------------------------------------------------
// Booking helpers
// ---------------------------------------------------------------------------

export type EnrolledPackageForBundle = {
    packageId: string;
    packageName: string;
    classesRemaining: number;
};

/** Returns current user's enrolled packages that are in the given bundle and have remaining classes. */
export async function getEnrolledPackagesForBundle(
    bundleId: string
): Promise<EnrolledPackageForBundle[]> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    if (!userId) return [];

    const bundle = await prisma.packageBundle.findUnique({
        where: { id: bundleId },
        select: { packageIds: true },
    });
    if (!bundle || bundle.packageIds.length === 0) return [];

    const student = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!student) return [];

    const enrollments = await prisma.studentEnrollment.findMany({
        where: {
            studentId: student.id,
            packageId: { in: bundle.packageIds },
            status: "ACTIVE",
        },
        include: {
            package: { select: { id: true, name: true } },
        },
    });

    return enrollments
        .filter((e) => e.classesUsed < e.classesTotal)
        .map((e) => ({
            packageId: e.package.id,
            packageName: e.package.name,
            classesRemaining: e.classesTotal - e.classesUsed,
        }));
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


function canManageBooking(
    role: string | undefined,
    userId: string,
    bookingUserId: string,
    teacherProfileId: string | null,
    bookingTeacherId: string
): boolean {
    if (role === AuthRole.ADMIN) return true;
    if (role === AuthRole.USER && bookingUserId === userId) return true;
    if (
        (role === AuthRole.TEACHER || role === AuthRole.ADMIN) &&
        teacherProfileId &&
        bookingTeacherId === teacherProfileId
    ) {
        return true;
    }
    return false;
}

/** Cancel a booking and free the slot. Refunds one class to the package enrollment when applicable. */
export async function cancelBooking(
    bookingId: string
): Promise<CreateBookingResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;

    if (!userId) return { success: false, error: "You must be signed in." };

    const parsed = cancelBookingSchema.safeParse({ bookingId });
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const booking = await prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        select: {
            id: true,
            userId: true,
            teacherId: true,
            packageId: true,
            status: true,
        },
    });
    if (!booking) {
        return { success: false, error: "Booking not found." };
    }
    if (booking.status === "CANCELLED") {
        return { success: false, error: "This booking is already cancelled." };
    }

    const teacherProfile =
        role === AuthRole.TEACHER || role === AuthRole.ADMIN
            ? await prisma.teacherProfile.findUnique({
                  where: { userId },
                  select: { id: true },
              })
            : null;

    if (!canManageBooking(role, userId, booking.userId, teacherProfile?.id ?? null, booking.teacherId)) {
        return { success: false, error: "You cannot cancel this booking." };
    }

    await prisma.$transaction(async (tx) => {
        if (booking.packageId) {
            const student = await tx.studentProfile.findUnique({
                where: { userId: booking.userId },
                select: { id: true },
            });
            if (student) {
                const enr = await tx.studentEnrollment.findUnique({
                    where: {
                        studentId_packageId: {
                            studentId: student.id,
                            packageId: booking.packageId,
                        },
                    },
                    select: { id: true, classesUsed: true },
                });
                if (enr && enr.classesUsed > 0) {
                    await tx.studentEnrollment.update({
                        where: { id: enr.id },
                        data: { classesUsed: { decrement: 1 } },
                    });
                }
            }
        }
        await tx.booking.delete({ where: { id: booking.id } });
    });

    revalidatePath("/calendar");
    revalidatePath("/packages");
    if (booking.packageId) {
        revalidatePath(`/packages/${booking.packageId}`);
    }
    return { success: true };
}

export type RescheduleSlotResult = {
    slots: Array<{
        startTime: string;
        endTime: string;
        date: string;
        category: string;
    }>;
};

export async function findSlotsForReschedule(
    bookingId: string,
    dateStr: string,
): Promise<RescheduleSlotResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;
    if (!userId) return { slots: [] };

    const parsed = cancelBookingSchema.safeParse({ bookingId });
    if (!parsed.success) return { slots: [] };

    const booking = await prisma.booking.findUnique({
        where: { id: parsed.data.bookingId },
        select: {
            id: true,
            userId: true,
            teacherId: true,
            bundleId: true,
            duration: true,
        },
    });
    if (!booking) return { slots: [] };

    const teacherProfile =
        role === AuthRole.TEACHER || role === AuthRole.ADMIN
            ? await prisma.teacherProfile.findUnique({
                  where: { userId },
                  select: { id: true },
              })
            : null;
    if (
        !canManageBooking(
            role,
            userId,
            booking.userId,
            teacherProfile?.id ?? null,
            booking.teacherId,
        )
    ) {
        return { slots: [] };
    }

    const date = new Date(dateStr + "T00:00:00Z");
    const now = new Date();

    if (booking.bundleId) {
        const allSlots = await generateSlots(date, booking.bundleId);
        const todayStr = now.toISOString().slice(0, 10);
        const filtered =
            dateStr === todayStr
                ? allSlots.filter(
                      (s) =>
                          new Date(`${dateStr}T${s.startTime}:00.000Z`) > now,
                  )
                : allSlots;

        return {
            slots: filtered.map((s) => {
                const sessionStart = new Date(
                    `${dateStr}T${s.startTime}:00.000Z`,
                );
                const category = computeLeadTimeCategory(now, sessionStart);
                return {
                    startTime: s.startTime,
                    endTime: s.endTime,
                    date: dateStr,
                    category,
                };
            }),
        };
    }

    const dateStart = toUtcDateOnly(date);
    const dateEnd = nextUtcDateOnly(date);
    const avails = await prisma.availability.findMany({
        where: { date: { gte: dateStart, lt: dateEnd }, booking: null },
        select: { startTime: true, endTime: true },
        orderBy: { startTime: "asc" },
    });

    const dur = booking.duration;
    const result: RescheduleSlotResult["slots"] = [];
    for (const a of avails) {
        const blockStart = timeToMinutes(a.startTime);
        const blockEnd = timeToMinutes(a.endTime);
        for (let c = blockStart; c + dur <= blockEnd; c += dur) {
            const st = minutesToTime(c);
            const et = minutesToTime(c + dur);
            const sessionStart = new Date(`${dateStr}T${st}:00.000Z`);
            if (
                dateStr === now.toISOString().slice(0, 10) &&
                sessionStart <= now
            )
                continue;
            const category = computeLeadTimeCategory(now, sessionStart);
            result.push({ startTime: st, endTime: et, date: dateStr, category });
        }
    }
    return { slots: result };
}

export async function rescheduleToSlot(payload: {
    bookingId: string;
    date: string;
    startTime: string;
}): Promise<CreateBookingResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;
    if (!userId) return { success: false, error: "You must be signed in." };

    const { bookingId, date: dateStr, startTime } = payload;

    const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        select: {
            id: true,
            userId: true,
            teacherId: true,
            packageId: true,
            bundleId: true,
            duration: true,
            status: true,
            availabilityId: true,
        },
    });
    if (!booking) return { success: false, error: "Booking not found." };
    if (booking.status === "CANCELLED") {
        return { success: false, error: "Cannot reschedule a cancelled booking." };
    }

    const teacherProfile =
        role === AuthRole.TEACHER || role === AuthRole.ADMIN
            ? await prisma.teacherProfile.findUnique({
                  where: { userId },
                  select: { id: true },
              })
            : null;

    if (
        !canManageBooking(
            role,
            userId,
            booking.userId,
            teacherProfile?.id ?? null,
            booking.teacherId,
        )
    ) {
        return { success: false, error: "You cannot reschedule this booking." };
    }

    const date = new Date(dateStr + "T00:00:00Z");
    const duration = booking.duration;

    let assignedTeacherId: string;
    if (booking.bundleId) {
        const slots = await generateSlots(date, booking.bundleId);
        const matching = slots.filter((s) => s.startTime === startTime);
        if (matching.length === 0) {
            return { success: false, error: "This slot is no longer available." };
        }
        assignedTeacherId = await assignTeacher(
            matching.map((s) => s.teacherId),
            date,
        );
    } else {
        assignedTeacherId = booking.teacherId;
    }

    const scheduledAt = new Date(`${dateStr}T${startTime}:00.000Z`);
    const endTime = minutesToTime(timeToMinutes(startTime) + duration);
    const dateOnly = toUtcDateOnly(date);
    const dateEnd = nextUtcDateOnly(date);
    const GAP = 10;

    try {
        await prisma.$transaction(async (tx) => {
            const existing = await tx.booking.findMany({
                where: {
                    teacherId: assignedTeacherId,
                    scheduledAt: { gte: dateOnly, lt: dateEnd },
                    status: { not: "CANCELLED" },
                    id: { not: bookingId },
                },
                select: { scheduledAt: true, duration: true },
            });

            const segStart = timeToMinutes(startTime);
            const segEnd = segStart + duration;
            for (const b of existing) {
                const bStart =
                    b.scheduledAt.getUTCHours() * 60 +
                    b.scheduledAt.getUTCMinutes();
                const bEnd = bStart + b.duration;
                if (segStart < bEnd + GAP && segEnd > bStart - GAP) {
                    throw new Error("SLOT_TAKEN");
                }
            }

            const newAvailability = await tx.availability.create({
                data: {
                    teacherId: assignedTeacherId,
                    date: dateOnly,
                    startTime,
                    endTime,
                    bundleIds: booking.bundleId ? [booking.bundleId] : [],
                },
            });

            await tx.booking.delete({ where: { id: bookingId } });

            await tx.booking.create({
                data: {
                    userId: booking.userId,
                    teacherId: assignedTeacherId,
                    availabilityId: newAvailability.id,
                    packageId: booking.packageId,
                    bundleId: booking.bundleId,
                    scheduledAt,
                    duration,
                    status: "CONFIRMED",
                },
            });
        });
    } catch (e) {
        if (e instanceof Error && e.message === "SLOT_TAKEN") {
            return {
                success: false,
                error: "This slot was just taken. Please try another time.",
            };
        }
        throw e;
    }

    revalidatePath("/calendar");
    revalidatePath("/packages");
    revalidatePath("/bookings");
    if (booking.packageId) {
        revalidatePath(`/packages/${booking.packageId}`);
    }
    return { success: true };
}

// ---------------------------------------------------------------------------
// Writing-only booking (duration === 0 bundles)
// ---------------------------------------------------------------------------

const NPT_OFFSET_MS = (5 * 60 + 45) * 60 * 1000;

export type CreateWritingOnlyBookingResult =
    | { success: true; bookingId: string }
    | { success: false; error: string };

export async function createWritingOnlyBooking(payload: {
    bundleId: string;
    submissionStart: string;
    submissionEnd: string;
}): Promise<CreateWritingOnlyBookingResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;

    if (!userId) return { success: false, error: "You must be signed in." };
    if (role !== AuthRole.USER) {
        return { success: false, error: "Only students can book sessions." };
    }

    const schema = z.object({
        bundleId: z.string().uuid(),
        submissionStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid start date"),
        submissionEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid end date"),
    });

    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
        return { success: false, error: firstError(parsed.error) };
    }

    const { bundleId, submissionStart: startStr, submissionEnd: endStr } = parsed.data;

    const submissionStart = new Date(startStr + "T00:00:00.000Z");
    const submissionEnd = new Date(endStr + "T23:59:59.999Z");

    if (isNaN(submissionStart.getTime()) || isNaN(submissionEnd.getTime())) {
        return { success: false, error: "Invalid date." };
    }

    const now = new Date();
    const todayStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    );
    if (submissionStart < todayStart) {
        return { success: false, error: "Start date must be today or later." };
    }
    if (submissionEnd <= submissionStart) {
        return { success: false, error: "End date must be after start date." };
    }

    const bundle = await prisma.packageBundle.findUnique({
        where: { id: bundleId },
        select: { id: true, isActive: true, duration: true, hasEvaluation: true },
    });
    if (!bundle) return { success: false, error: "Bundle not found." };
    if (!bundle.isActive) return { success: false, error: "This bundle is not active." };
    if (bundle.duration !== 0) {
        return { success: false, error: "This bundle is not a writing-only bundle." };
    }

    const teachers = await prisma.teacherProfile.findMany({
        where: { isActive: true, isApproved: true },
        select: { id: true },
    });
    if (teachers.length === 0) {
        return { success: false, error: "No teachers available at this time." };
    }

    // Current week boundaries (Sunday–Saturday in UTC+5:45)
    const nowNpt = new Date(Date.now() + NPT_OFFSET_MS);
    const dayOfWeek = nowNpt.getUTCDay();
    const sundayNpt = new Date(nowNpt);
    sundayNpt.setUTCDate(sundayNpt.getUTCDate() - dayOfWeek);
    sundayNpt.setUTCHours(0, 0, 0, 0);
    const nextSundayNpt = new Date(sundayNpt);
    nextSundayNpt.setUTCDate(nextSundayNpt.getUTCDate() + 7);

    const weekStartUtc = new Date(sundayNpt.getTime() - NPT_OFFSET_MS);
    const weekEndUtc = new Date(nextSundayNpt.getTime() - NPT_OFFSET_MS);

    const teacherIds = teachers.map((t) => t.id);
    const bookingCounts = await prisma.booking.groupBy({
        by: ["teacherId"],
        where: {
            teacherId: { in: teacherIds },
            status: "CONFIRMED",
            scheduledAt: { gte: weekStartUtc, lt: weekEndUtc },
        },
        _count: { id: true },
    });

    const countMap = new Map(
        bookingCounts.map((b) => [b.teacherId, b._count.id]),
    );
    const sorted = teacherIds
        .map((id) => ({ id, count: countMap.get(id) ?? 0 }))
        .sort((a, b) => a.count - b.count || a.id.localeCompare(b.id));

    const assignedTeacherId = sorted[0]!.id;

    const booking = await prisma.$transaction(async (tx) => {
        const availability = await tx.availability.create({
            data: {
                teacherId: assignedTeacherId,
                date: toUtcDateOnly(submissionStart),
                startTime: "00:00",
                endTime: "00:00",
                bundleIds: [bundleId],
            },
        });

        const writingQuestionId = bundle.hasEvaluation
            ? await assignWritingQuestion(userId, tx)
            : null;

        return tx.booking.create({
            data: {
                userId,
                teacherId: assignedTeacherId,
                availabilityId: availability.id,
                bundleId,
                scheduledAt: submissionStart,
                duration: 0,
                status: "CONFIRMED",
                submissionStart,
                submissionEnd,
                writingQuestionId,
            },
        });
    });

    revalidatePath("/packages");
    revalidatePath("/calendar");
    return { success: true, bookingId: booking.id };
}

// ---------------------------------------------------------------------------
// Scheduling engine: preferred-time slot finder & slot-based booking
// ---------------------------------------------------------------------------

export type SlotOffer = {
    startTime: string;
    endTime: string;
    duration: number;
    date: string;
    category: LeadTimeCategory;
    price: number;
};

export type FindSlotResult =
    | { found: true; slot: SlotOffer }
    | { found: false; alternatives: SlotOffer[]; message: string };

function getCategoryPrice(
    category: LeadTimeCategory,
    bundle: {
        priceStandard: unknown;
        pricePriority: unknown;
        priceInstant: unknown;
    },
): number {
    switch (category) {
        case "STANDARD":
            return Number(bundle.priceStandard);
        case "PRIORITY":
            return Number(bundle.pricePriority);
        case "INSTANT":
            return Number(bundle.priceInstant);
    }
}

/**
 * Student selects date + preferred time → server returns ONE primary offered slot
 * (best match to preference) with the applicable lead-time category and price.
 * NO teacher names are exposed.
 *
 * If no slots on the requested date, returns nearest alternatives on nearby dates.
 */
export async function findSlotForPreference(
    bundleId: string,
    dateStr: string,
    preferredTime: string,
): Promise<FindSlotResult> {
    const session = await auth();
    if (!session?.user) {
        return {
            found: false,
            alternatives: [],
            message: "You must be signed in.",
        };
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return {
            found: false,
            alternatives: [],
            message: "Invalid date format.",
        };
    }
    if (!/^\d{1,2}:\d{2}$/.test(preferredTime)) {
        return {
            found: false,
            alternatives: [],
            message: "Invalid time format.",
        };
    }

    const bundle = await prisma.packageBundle.findUnique({
        where: { id: bundleId },
        select: {
            duration: true,
            isActive: true,
            priceStandard: true,
            pricePriority: true,
            priceInstant: true,
        },
    });
    if (!bundle?.isActive) {
        return {
            found: false,
            alternatives: [],
            message: "Bundle not found or inactive.",
        };
    }

    const date = new Date(dateStr + "T00:00:00Z");
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const allSlots = await generateSlots(date, bundleId);

    // Filter out past slots when searching today
    const slots =
        dateStr === todayStr
            ? allSlots.filter(
                  (s) =>
                      new Date(`${dateStr}T${s.startTime}:00.000Z`) > now,
              )
            : allSlots;

    if (slots.length === 0) {
        const alternatives = await findAlternativeDates(
            date,
            bundleId,
            bundle,
            preferredTime,
            now,
        );
        return {
            found: false,
            alternatives,
            message: "No available slots on this date.",
        };
    }

    // Find the closest slot to the preferred time
    const prefMin = timeToMinutes(preferredTime);
    const sorted = [...slots].sort(
        (a, b) =>
            Math.abs(timeToMinutes(a.startTime) - prefMin) -
            Math.abs(timeToMinutes(b.startTime) - prefMin),
    );
    const best = sorted[0];

    const sessionStart = new Date(`${dateStr}T${best.startTime}:00.000Z`);
    const category = computeLeadTimeCategory(now, sessionStart);
    const price = getCategoryPrice(category, bundle);

    return {
        found: true,
        slot: {
            startTime: best.startTime,
            endTime: best.endTime,
            duration: bundle.duration,
            date: dateStr,
            category,
            price,
        },
    };
}

async function findAlternativeDates(
    baseDate: Date,
    bundleId: string,
    bundle: {
        duration: number;
        priceStandard: unknown;
        pricePriority: unknown;
        priceInstant: unknown;
    },
    preferredTime: string,
    now: Date,
): Promise<SlotOffer[]> {
    const todayStr = now.toISOString().slice(0, 10);
    const prefMin = timeToMinutes(preferredTime);
    const alternatives: SlotOffer[] = [];

    for (let offset = 1; offset <= 5 && alternatives.length < 3; offset++) {
        for (const dir of [1, -1]) {
            if (alternatives.length >= 3) break;

            const altDate = new Date(baseDate);
            altDate.setUTCDate(altDate.getUTCDate() + offset * dir);
            const altDateStr = altDate.toISOString().slice(0, 10);
            if (altDateStr < todayStr) continue;

            const altSlots = await generateSlots(altDate, bundleId);
            if (altSlots.length === 0) continue;

            const best = [...altSlots].sort(
                (a, b) =>
                    Math.abs(timeToMinutes(a.startTime) - prefMin) -
                    Math.abs(timeToMinutes(b.startTime) - prefMin),
            )[0];

            const sessionStart = new Date(
                `${altDateStr}T${best.startTime}:00.000Z`,
            );
            if (sessionStart <= now) continue;

            const category = computeLeadTimeCategory(now, sessionStart);
            alternatives.push({
                startTime: best.startTime,
                endTime: best.endTime,
                duration: bundle.duration,
                date: altDateStr,
                category,
                price: getCategoryPrice(category, bundle),
            });
        }
    }

    return alternatives;
}

/**
 * Creates a booking from the scheduling engine flow:
 * re-verifies slot availability, assigns a teacher, creates
 * an Availability segment + Booking in one transaction.
 */
export async function createBookingForSlot(payload: {
    bundleId: string;
    date: string;
    startTime: string;
    packageId?: string;
}): Promise<CreateBookingResult> {
    const session = await auth();
    const userId = (session?.user as { id?: string })?.id;
    const role = (session?.user as { role?: string })?.role;

    if (!userId) return { success: false, error: "You must be signed in." };
    if (role !== AuthRole.USER) {
        return { success: false, error: "Only students can book sessions." };
    }

    const { bundleId, date: dateStr, startTime, packageId } = payload;

    if (!bundleId || !dateStr || !startTime) {
        return { success: false, error: "Missing required fields." };
    }

    const bundle = await prisma.packageBundle.findUnique({
        where: { id: bundleId },
        select: { duration: true, isActive: true, hasEvaluation: true },
    });
    if (!bundle?.isActive) {
        return { success: false, error: "Bundle not found or inactive." };
    }

    const student = await prisma.studentProfile.findUnique({
        where: { userId },
        select: { id: true },
    });
    if (!student) {
        return { success: false, error: "Student profile not found." };
    }

    // Re-generate slots to verify availability at booking time
    const date = new Date(dateStr + "T00:00:00Z");
    const slots = await generateSlots(date, bundleId);
    const matchingSlots = slots.filter((s) => s.startTime === startTime);

    if (matchingSlots.length === 0) {
        return {
            success: false,
            error: "This slot is no longer available. Please search again.",
        };
    }

    // Assign teacher (lowest weekly load, alphabetical tie-break)
    const eligibleTeacherIds = matchingSlots.map((s) => s.teacherId);
    const assignedTeacherId = await assignTeacher(eligibleTeacherIds, date);

    // Package enrollment check
    let enrollmentId: string | null = null;
    if (packageId) {
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
        if (!enrollment || enrollment.status !== "ACTIVE") {
            return {
                success: false,
                error: "You are not enrolled in this package.",
            };
        }
        if (enrollment.classesUsed >= enrollment.classesTotal) {
            return {
                success: false,
                error: "No classes remaining in this package.",
            };
        }
        enrollmentId = enrollment.id;
    }

    const scheduledAt = new Date(`${dateStr}T${startTime}:00.000Z`);
    const endTime = minutesToTime(
        timeToMinutes(startTime) + bundle.duration,
    );
    const dateOnly = toUtcDateOnly(date);
    const dateEnd = nextUtcDateOnly(date);
    const GAP = 10;

    try {
        await prisma.$transaction(async (tx) => {
            // Double-check no conflicting booking inside the transaction
            const existing = await tx.booking.findMany({
                where: {
                    teacherId: assignedTeacherId,
                    scheduledAt: { gte: dateOnly, lt: dateEnd },
                    status: { not: "CANCELLED" },
                },
                select: { scheduledAt: true, duration: true },
            });

            const segStart = timeToMinutes(startTime);
            const segEnd = segStart + bundle.duration;
            for (const b of existing) {
                const bStart =
                    b.scheduledAt.getUTCHours() * 60 +
                    b.scheduledAt.getUTCMinutes();
                const bEnd = bStart + b.duration;
                if (segStart < bEnd + GAP && segEnd > bStart - GAP) {
                    throw new Error("SLOT_TAKEN");
                }
            }

            const newAvailability = await tx.availability.create({
                data: {
                    teacherId: assignedTeacherId,
                    date: dateOnly,
                    startTime,
                    endTime,
                    bundleIds: [bundleId],
                },
            });

            const writingQuestionId = bundle.hasEvaluation
                ? await assignWritingQuestion(userId, tx)
                : null;

            await tx.booking.create({
                data: {
                    userId,
                    teacherId: assignedTeacherId,
                    availabilityId: newAvailability.id,
                    packageId: packageId ?? null,
                    bundleId,
                    scheduledAt,
                    duration: bundle.duration,
                    status: "CONFIRMED",
                    writingQuestionId,
                },
            });

            if (enrollmentId) {
                await tx.studentEnrollment.update({
                    where: { id: enrollmentId },
                    data: { classesUsed: { increment: 1 } },
                });
            }
        });
    } catch (e) {
        if (e instanceof Error && e.message === "SLOT_TAKEN") {
            return {
                success: false,
                error: "This slot was just taken. Please search again.",
            };
        }
        throw e;
    }

    revalidatePath("/packages");
    revalidatePath("/calendar");
    revalidatePath("/students");
    return { success: true };
}

