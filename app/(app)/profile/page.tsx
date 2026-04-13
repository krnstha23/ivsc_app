import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/profile-form";

export default async function ProfilePage() {
    const session = await auth();
    if (!session?.user) redirect("/login");

    const userId = (session.user as { id?: string }).id;
    if (!userId) redirect("/login");

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            firstName: true,
            middleName: true,
            lastName: true,
            email: true,
            phone: true,
            teacherProfile: { select: { bio: true } },
        },
    });

    if (!user) redirect("/login");

    const showBio = user.teacherProfile != null;

    return (
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
            <div className="px-4 lg:px-6">
                <h1 className="text-xl font-semibold">Profile</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    Update your name, contact details
                    {showBio ? ", and teaching bio" : ""}.
                </p>
            </div>
            <div className="px-4 lg:px-6">
                <ProfileForm
                    initial={{
                        firstName: user.firstName,
                        middleName: user.middleName,
                        lastName: user.lastName,
                        email: user.email,
                        phone: user.phone,
                        bio: user.teacherProfile?.bio ?? null,
                    }}
                    showBio={showBio}
                />
            </div>
        </div>
    );
}
