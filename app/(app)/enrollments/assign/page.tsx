import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { canAccess, type Role } from "@/lib/permissions";
import { AssignEnrollmentForm } from "./assign-form";

export default async function AssignEnrollmentPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const role = (session.user as { role?: string }).role as Role | undefined;
  if (!canAccess(role, ["ADMIN"])) redirect("/dashboard");

  const students = await prisma.studentProfile.findMany({
    select: {
      id: true,
      user: {
        select: { firstName: true, lastName: true, email: true },
      },
    },
    where: { user: { role: "USER" } },
    orderBy: { user: { firstName: "asc" } },
  });

  const packages = await prisma.package.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
      <div className="px-4 lg:px-6">
        <h1 className="text-xl font-semibold">Assign Package to Student</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create a new enrollment for a student.
        </p>
      </div>

      <div className="px-4 lg:px-6 max-w-lg">
        <AssignEnrollmentForm
          students={students.map((s) => ({
            id: s.id,
            name: `${s.user.firstName} ${s.user.lastName}`,
            email: s.user.email,
          }))}
          packages={packages}
        />
      </div>
    </div>
  );
}
