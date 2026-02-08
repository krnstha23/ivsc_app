/**
 * Database seed script for IVCS.
 * Run with: npm run db:seed  or  npx prisma db seed
 * Best used after: npx prisma migrate reset
 */
import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import {
    PrismaClient,
    Role,
    BookingStatus,
    PaymentStatus,
    EnrollmentStatus,
} from "../app/generated/prisma/client";
import { hashPassword } from "../lib/passwords";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add it to .env to run the seed.");
}
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
});

const DEV_PASSWORD = "password123";

function addDays(date: Date, days: number): Date {
    const out = new Date(date);
    out.setUTCDate(out.getUTCDate() + days);
    return out;
}

function toDateOnly(d: Date): Date {
    return new Date(
        Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
    );
}

async function main() {
    const passwordHash = await hashPassword(DEV_PASSWORD);

    await prisma.$transaction(async (tx) => {
        // 1. Users
        const admin = await tx.user.create({
            data: {
                username: "admin",
                email: "admin@ivcs.local",
                firstName: "Admin",
                lastName: "User",
                passwordHash,
                role: Role.ADMIN,
            },
        });
        const teacher1 = await tx.user.create({
            data: {
                username: "teacher1",
                email: "teacher1@ivcs.local",
                firstName: "Jane",
                lastName: "Smith",
                passwordHash,
                role: Role.TEACHER,
            },
        });
        const teacher2 = await tx.user.create({
            data: {
                username: "teacher2",
                email: "teacher2@ivcs.local",
                firstName: "John",
                lastName: "Doe",
                passwordHash,
                role: Role.TEACHER,
            },
        });
        const student1 = await tx.user.create({
            data: {
                username: "student1",
                email: "student1@ivcs.local",
                firstName: "Alex",
                lastName: "Student",
                passwordHash,
                role: Role.USER,
            },
        });
        const student2 = await tx.user.create({
            data: {
                username: "student2",
                email: "student2@ivcs.local",
                firstName: "Sam",
                lastName: "Learner",
                passwordHash,
                role: Role.USER,
            },
        });
        const student3 = await tx.user.create({
            data: {
                username: "student3",
                email: "student3@ivcs.local",
                firstName: "Jordan",
                lastName: "Pupil",
                passwordHash,
                role: Role.USER,
            },
        });

        // 2. Profiles
        const studentProfile1 = await tx.studentProfile.create({
            data: { userId: student1.id },
        });
        const studentProfile2 = await tx.studentProfile.create({
            data: { userId: student2.id },
        });
        const studentProfile3 = await tx.studentProfile.create({
            data: { userId: student3.id },
        });
        const teacherProfile1 = await tx.teacherProfile.create({
            data: { userId: teacher1.id, bio: "Math and science tutor." },
        });
        const teacherProfile2 = await tx.teacherProfile.create({
            data: { userId: teacher2.id, bio: "English and humanities." },
        });

        // 3. Packages & Bundle
        const pkgMath = await tx.package.create({
            data: {
                name: "Math 10",
                description: "Grade 10 Mathematics",
                price: 29.99,
                subjects: ["Math"],
            },
        });
        const pkgEnglish = await tx.package.create({
            data: {
                name: "English 10",
                description: "Grade 10 English",
                price: 29.99,
                subjects: ["English"],
            },
        });
        const pkgScience = await tx.package.create({
            data: {
                name: "Science 10",
                description: "Grade 10 Science",
                price: 34.99,
                subjects: ["Science"],
            },
        });
        const bundle = await tx.packageBundle.create({
            data: {
                name: "Grade 10 Core",
                description: "Math, English, Science",
                price: 79.99,
                discountPercent: 10,
                isFeatured: true,
            },
        });
        await tx.packageBundleItem.createMany({
            data: [
                { bundleId: bundle.id, packageId: pkgMath.id, displayOrder: 0 },
                {
                    bundleId: bundle.id,
                    packageId: pkgEnglish.id,
                    displayOrder: 1,
                },
                {
                    bundleId: bundle.id,
                    packageId: pkgScience.id,
                    displayOrder: 2,
                },
            ],
        });

        // 4. TeacherPackage
        await tx.teacherPackage.createMany({
            data: [
                { teacherId: teacherProfile1.id, packageId: pkgMath.id },
                { teacherId: teacherProfile1.id, packageId: pkgScience.id },
                { teacherId: teacherProfile2.id, packageId: pkgEnglish.id },
            ],
        });

        // 5. StudentEnrollment
        await tx.studentEnrollment.createMany({
            data: [
                {
                    studentId: studentProfile1.id,
                    packageId: pkgMath.id,
                    classesTotal: 10,
                    classesUsed: 2,
                    status: EnrollmentStatus.ACTIVE,
                },
                {
                    studentId: studentProfile2.id,
                    packageId: pkgEnglish.id,
                    classesTotal: 10,
                    classesUsed: 0,
                    status: EnrollmentStatus.ACTIVE,
                },
            ],
        });

        // 6. Availability (next 7 days, one slot per day per teacher)
        const today = toDateOnly(new Date());
        const slots: {
            teacherId: string;
            date: Date;
            startTime: string;
            endTime: string;
        }[] = [];
        for (let d = 1; d <= 7; d++) {
            const date = addDays(today, d);
            slots.push(
                {
                    teacherId: teacherProfile1.id,
                    date,
                    startTime: "09:00",
                    endTime: "10:00",
                },
                {
                    teacherId: teacherProfile1.id,
                    date,
                    startTime: "14:00",
                    endTime: "15:00",
                },
                {
                    teacherId: teacherProfile2.id,
                    date,
                    startTime: "10:00",
                    endTime: "11:00",
                },
            );
        }
        const availabilities = await Promise.all(
            slots.map((s) => tx.availability.create({ data: s })),
        );

        // 7. Bookings (use first few availabilities)
        const slot1 = availabilities[0];
        const slot2 = availabilities[1];
        const slot3 = availabilities[2];
        const slot4 = availabilities[3];
        const scheduled1 = new Date(slot1.date);
        scheduled1.setUTCHours(9, 0, 0, 0);
        const scheduled2 = new Date(slot2.date);
        scheduled2.setUTCHours(14, 0, 0, 0);
        const scheduled3 = new Date(slot3.date);
        scheduled3.setUTCHours(10, 0, 0, 0);
        const scheduled4 = new Date(slot4.date);
        scheduled4.setUTCHours(14, 0, 0, 0);

        await tx.booking.createMany({
            data: [
                {
                    userId: student1.id,
                    teacherId: teacherProfile1.id,
                    availabilityId: slot1.id,
                    packageId: pkgMath.id,
                    scheduledAt: scheduled1,
                    duration: 60,
                    status: BookingStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.PAID,
                },
                {
                    userId: student2.id,
                    teacherId: teacherProfile1.id,
                    availabilityId: slot2.id,
                    packageId: pkgScience.id,
                    scheduledAt: scheduled2,
                    duration: 60,
                    status: BookingStatus.PENDING,
                    paymentStatus: PaymentStatus.PENDING,
                },
                {
                    userId: student1.id,
                    teacherId: teacherProfile2.id,
                    availabilityId: slot3.id,
                    packageId: pkgEnglish.id,
                    scheduledAt: scheduled3,
                    duration: 60,
                    status: BookingStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.PAID,
                },
                {
                    userId: student3.id,
                    teacherId: teacherProfile1.id,
                    availabilityId: slot4.id,
                    scheduledAt: scheduled4,
                    duration: 45,
                    status: BookingStatus.PENDING,
                    paymentStatus: PaymentStatus.PENDING,
                },
            ],
        });

        // 8. ClassMetadata (past completed classes)
        const yesterday = addDays(today, -1);
        const lastWeek = addDays(today, -7);
        await tx.classMetadata.createMany({
            data: [
                {
                    packageId: pkgMath.id,
                    teacherId: teacherProfile1.id,
                    studentId: student1.id,
                    date: yesterday,
                    startTime: "09:00",
                    endTime: "10:00",
                },
                {
                    packageId: pkgEnglish.id,
                    teacherId: teacherProfile2.id,
                    studentId: student1.id,
                    date: lastWeek,
                    startTime: "10:00",
                    endTime: "11:00",
                },
            ],
        });
    });

    console.log(
        "Seed completed: users, profiles, packages, bundle, enrollments, availability, bookings, class metadata.",
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
        await pool.end();
    });
