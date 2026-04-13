"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod/v4";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";

type ActionResult = { success: true } | { success: false; error: string };

export async function assignPackageToStudent(
  studentId: string,
  packageId: string,
  classesTotal: number
): Promise<ActionResult> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role as
    | Role
    | undefined;
  if (!canAccess(role, ["ADMIN"])) {
    return { success: false, error: "Not authorized." };
  }

  const schema = z.object({
    studentId: z.string().uuid(),
    packageId: z.string().uuid(),
    classesTotal: z.number().int().min(1, "At least 1 class required"),
  });

  const parsed = schema.safeParse({ studentId, packageId, classesTotal });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const [student, pkg] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { id: parsed.data.studentId } }),
    prisma.package.findUnique({ where: { id: parsed.data.packageId } }),
  ]);

  if (!student) return { success: false, error: "Student not found." };
  if (!pkg) return { success: false, error: "Package not found." };

  const existing = await prisma.studentEnrollment.findUnique({
    where: {
      studentId_packageId: {
        studentId: parsed.data.studentId,
        packageId: parsed.data.packageId,
      },
    },
  });
  if (existing) {
    return { success: false, error: "Student is already enrolled in this package." };
  }

  await prisma.studentEnrollment.create({
    data: {
      studentId: parsed.data.studentId,
      packageId: parsed.data.packageId,
      classesTotal: parsed.data.classesTotal,
    },
  });

  revalidatePath("/enrollments");
  revalidatePath("/packages");
  return { success: true };
}

export async function updateEnrollment(
  enrollmentId: string,
  data: { classesTotal?: number; status?: string }
): Promise<ActionResult> {
  const session = await auth();
  const role = (session?.user as { role?: string } | undefined)?.role as
    | Role
    | undefined;
  if (!canAccess(role, ["ADMIN"])) {
    return { success: false, error: "Not authorized." };
  }

  const schema = z.object({
    enrollmentId: z.string().uuid(),
    classesTotal: z.number().int().min(1).optional(),
    status: z.enum(["ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  });

  const parsed = schema.safeParse({ enrollmentId, ...data });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Validation failed" };
  }

  const enrollment = await prisma.studentEnrollment.findUnique({
    where: { id: parsed.data.enrollmentId },
  });
  if (!enrollment) {
    return { success: false, error: "Enrollment not found." };
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.classesTotal !== undefined) {
    updateData.classesTotal = parsed.data.classesTotal;
  }
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
  }

  if (Object.keys(updateData).length === 0) {
    return { success: false, error: "Nothing to update." };
  }

  await prisma.studentEnrollment.update({
    where: { id: parsed.data.enrollmentId },
    data: updateData,
  });

  revalidatePath("/enrollments");
  revalidatePath("/packages");
  return { success: true };
}
