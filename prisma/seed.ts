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
        // --- Users ---
        const admin = await tx.user.create({
            data: {
                userName: "admin",
                email: "admin@ivcs.local",
                firstName: "Admin",
                lastName: "User",
                passwordHash,
                role: Role.ADMIN,
            },
        });
        const teacher1 = await tx.user.create({
            data: {
                userName: "teacher1",
                email: "teacher1@ivcs.local",
                firstName: "Sita",
                lastName: "Sharma",
                passwordHash,
                role: Role.TEACHER,
            },
        });
        const teacher2 = await tx.user.create({
            data: {
                userName: "teacher2",
                email: "teacher2@ivcs.local",
                firstName: "Ramesh",
                lastName: "Adhikari",
                passwordHash,
                role: Role.TEACHER,
            },
        });
        const student1 = await tx.user.create({
            data: {
                userName: "student1",
                email: "student1@ivcs.local",
                firstName: "Alex",
                lastName: "Student",
                passwordHash,
                role: Role.USER,
            },
        });
        const student2 = await tx.user.create({
            data: {
                userName: "student2",
                email: "student2@ivcs.local",
                firstName: "Sam",
                lastName: "Learner",
                passwordHash,
                role: Role.USER,
            },
        });
        const student3 = await tx.user.create({
            data: {
                userName: "student3",
                email: "student3@ivcs.local",
                firstName: "Jordan",
                lastName: "Pupil",
                passwordHash,
                role: Role.USER,
            },
        });

        // --- Profiles ---
        const studentProfile1 = await tx.studentProfile.create({
            data: { userId: student1.id },
        });
        const studentProfile2 = await tx.studentProfile.create({
            data: { userId: student2.id },
        });
        await tx.studentProfile.create({
            data: { userId: student3.id },
        });
        const teacherProfile1 = await tx.teacherProfile.create({
            data: {
                userId: teacher1.id,
                bio: "IELTS Speaking & Writing instructor with 5 years experience.",
                isApproved: true,
            },
        });
        const teacherProfile2 = await tx.teacherProfile.create({
            data: {
                userId: teacher2.id,
                bio: "Specializes in IELTS Academic Writing and Reading.",
                isApproved: true,
            },
        });

        // --- Packages ---
        const pkgSpeaking = await tx.package.create({
            data: {
                name: "IELTS Speaking",
                description:
                    "1-on-1 mock speaking tests with feedback and scoring.",
                price: 29.99,
            },
        });
        const pkgWriting = await tx.package.create({
            data: {
                name: "IELTS Writing",
                description:
                    "Task 1 & Task 2 evaluation with detailed band-score breakdown.",
                price: 29.99,
            },
        });
        const pkgReading = await tx.package.create({
            data: {
                name: "IELTS Reading",
                description: "Guided reading practice with timed mock tests.",
                price: 24.99,
            },
        });

        // --- Bundles ---
        const bundleSpeaking = await tx.packageBundle.create({
            data: {
                name: "Speaking Practice",
                description: "10 mock speaking sessions with evaluation",
                priceStandard: 49.99,
                pricePriority: 59.99,
                priceInstant: 69.99,
                duration: 30,
                hasEvaluation: true,
                isFeatured: true,
                packageIds: [pkgSpeaking.id],
            },
        });
        const bundleWriting = await tx.packageBundle.create({
            data: {
                name: "Writing Review",
                description: "Task 1 & 2 submissions evaluated by an examiner",
                priceStandard: 39.99,
                pricePriority: 49.99,
                priceInstant: 59.99,
                duration: 0,
                hasEvaluation: true,
                packageIds: [pkgWriting.id],
            },
        });
        const bundleFullPrep = await tx.packageBundle.create({
            data: {
                name: "Full IELTS Prep",
                description: "Speaking, Writing, and Reading combined",
                priceStandard: 99.99,
                pricePriority: 119.99,
                priceInstant: 139.99,
                duration: 45,
                hasEvaluation: true,
                discountPercent: 15,
                isFeatured: true,
                packageIds: [pkgSpeaking.id, pkgWriting.id, pkgReading.id],
            },
        });

        // --- Enrollments ---
        await tx.studentEnrollment.createMany({
            data: [
                {
                    studentId: studentProfile1.id,
                    packageId: pkgSpeaking.id,
                    classesTotal: 10,
                    classesUsed: 2,
                    status: EnrollmentStatus.ACTIVE,
                },
                {
                    studentId: studentProfile2.id,
                    packageId: pkgWriting.id,
                    classesTotal: 10,
                    classesUsed: 0,
                    status: EnrollmentStatus.ACTIVE,
                },
                {
                    studentId: studentProfile1.id,
                    packageId: pkgReading.id,
                    classesTotal: 8,
                    classesUsed: 1,
                    status: EnrollmentStatus.ACTIVE,
                },
            ],
        });

        // --- Availability (continuous blocks, next 7 days) ---
        const today = toDateOnly(new Date());
        const availabilities: Array<{
            id: string;
            teacherId: string;
            date: Date;
            startTime: string;
            endTime: string;
        }> = [];

        for (let d = 1; d <= 7; d++) {
            const date = addDays(today, d);

            const a1 = await tx.availability.create({
                data: {
                    teacherId: teacherProfile1.id,
                    date,
                    startTime: "09:00",
                    endTime: "13:00",
                },
            });
            availabilities.push({ ...a1, teacherId: teacherProfile1.id });

            const a2 = await tx.availability.create({
                data: {
                    teacherId: teacherProfile1.id,
                    date,
                    startTime: "14:00",
                    endTime: "17:00",
                },
            });
            availabilities.push({ ...a2, teacherId: teacherProfile1.id });

            const a3 = await tx.availability.create({
                data: {
                    teacherId: teacherProfile2.id,
                    date,
                    startTime: "10:00",
                    endTime: "16:00",
                },
            });
            availabilities.push({ ...a3, teacherId: teacherProfile2.id });
        }

        // --- Bookings (use first day's availability blocks) ---
        // Teacher 1, morning block (09:00-13:00), day+1
        const block1 = availabilities[0]!;
        const scheduled1 = new Date(block1.date);
        scheduled1.setUTCHours(9, 0, 0, 0);

        // Teacher 1, afternoon block (14:00-17:00), day+1
        const block2 = availabilities[1]!;
        const scheduled2 = new Date(block2.date);
        scheduled2.setUTCHours(14, 0, 0, 0);

        // Teacher 2, block (10:00-16:00), day+1
        const block3 = availabilities[2]!;
        const scheduled3 = new Date(block3.date);
        scheduled3.setUTCHours(10, 0, 0, 0);

        // Teacher 1, morning block day+2
        const block4 = availabilities[3]!;
        const scheduled4 = new Date(block4.date);
        scheduled4.setUTCHours(9, 30, 0, 0);

        await tx.booking.createMany({
            data: [
                {
                    userId: student1.id,
                    teacherId: teacherProfile1.id,
                    availabilityId: block1.id,
                    packageId: pkgSpeaking.id,
                    bundleId: bundleSpeaking.id,
                    scheduledAt: scheduled1,
                    duration: 30,
                    status: BookingStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.PAID,
                },
                {
                    userId: student2.id,
                    teacherId: teacherProfile1.id,
                    availabilityId: block2.id,
                    bundleId: bundleFullPrep.id,
                    scheduledAt: scheduled2,
                    duration: 45,
                    status: BookingStatus.PENDING,
                    paymentStatus: PaymentStatus.PENDING,
                },
                {
                    userId: student1.id,
                    teacherId: teacherProfile2.id,
                    availabilityId: block3.id,
                    packageId: pkgSpeaking.id,
                    bundleId: bundleSpeaking.id,
                    scheduledAt: scheduled3,
                    duration: 30,
                    status: BookingStatus.CONFIRMED,
                    paymentStatus: PaymentStatus.PAID,
                },
                {
                    userId: student3.id,
                    teacherId: teacherProfile1.id,
                    availabilityId: block4.id,
                    bundleId: bundleFullPrep.id,
                    scheduledAt: scheduled4,
                    duration: 45,
                    status: BookingStatus.PENDING,
                    paymentStatus: PaymentStatus.PENDING,
                },
            ],
        });

        // --- Class metadata (past completed sessions) ---
        const yesterday = addDays(today, -1);
        const lastWeek = addDays(today, -7);
        await tx.classMetadata.createMany({
            data: [
                {
                    packageId: pkgSpeaking.id,
                    teacherId: teacherProfile1.id,
                    studentId: student1.id,
                    date: yesterday,
                    startTime: "09:00",
                    endTime: "09:30",
                },
                {
                    packageId: pkgSpeaking.id,
                    teacherId: teacherProfile2.id,
                    studentId: student1.id,
                    date: lastWeek,
                    startTime: "10:00",
                    endTime: "10:30",
                },
            ],
        });

        // --- Session Room test scenarios ---
        // 7 bookings covering every step for both speaking and writing-only bundles.
        // IDs are printed at the end of the seed output for quick navigation.

        // Past availability blocks for speaking-session room bookings
        const roomSpkAv1 = await tx.availability.create({
            data: {
                teacherId: teacherProfile1.id,
                date: toDateOnly(addDays(today, -3)),
                startTime: "10:00",
                endTime: "10:30",
                bundleIds: [bundleSpeaking.id],
            },
        });
        const roomSpkAv2 = await tx.availability.create({
            data: {
                teacherId: teacherProfile2.id,
                date: toDateOnly(addDays(today, -4)),
                startTime: "11:00",
                endTime: "11:30",
                bundleIds: [bundleSpeaking.id],
            },
        });
        const roomSpkAv3 = await tx.availability.create({
            data: {
                teacherId: teacherProfile2.id,
                date: toDateOnly(addDays(today, -5)),
                startTime: "13:00",
                endTime: "13:30",
                bundleIds: [bundleSpeaking.id],
            },
        });
        const roomSpkAv4 = await tx.availability.create({
            data: {
                teacherId: teacherProfile1.id,
                date: toDateOnly(addDays(today, -8)),
                startTime: "14:00",
                endTime: "14:45",
                bundleIds: [bundleFullPrep.id],
            },
        });

        // Past availability blocks for writing-only room bookings
        const roomWrtAv1 = await tx.availability.create({
            data: {
                teacherId: teacherProfile1.id,
                date: today,
                startTime: "00:00",
                endTime: "00:00",
                bundleIds: [bundleWriting.id],
            },
        });
        const roomWrtAv2 = await tx.availability.create({
            data: {
                teacherId: teacherProfile1.id,
                date: toDateOnly(addDays(today, -2)),
                startTime: "00:00",
                endTime: "00:00",
                bundleIds: [bundleWriting.id],
            },
        });
        const roomWrtAv3 = await tx.availability.create({
            data: {
                teacherId: teacherProfile2.id,
                date: toDateOnly(addDays(today, -5)),
                startTime: "00:00",
                endTime: "00:00",
                bundleIds: [bundleWriting.id],
            },
        });

        // Step 1 — Speaking (no Meet link yet)
        const roomStep1 = await tx.booking.create({
            data: {
                userId: student1.id,
                teacherId: teacherProfile1.id,
                availabilityId: roomSpkAv1.id,
                bundleId: bundleSpeaking.id,
                scheduledAt: new Date(
                    `${addDays(today, -3).toISOString().split("T")[0]}T10:00:00.000Z`,
                ),
                duration: 30,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
            },
        });

        // Step 2 — Speaking (Meet link set, no PDF yet)
        const roomStep2 = await tx.booking.create({
            data: {
                userId: student2.id,
                teacherId: teacherProfile2.id,
                availabilityId: roomSpkAv2.id,
                bundleId: bundleSpeaking.id,
                scheduledAt: new Date(
                    `${addDays(today, -4).toISOString().split("T")[0]}T11:00:00.000Z`,
                ),
                duration: 30,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
                meetLink: "https://meet.google.com/abc-defg-hij",
            },
        });

        // Step 3 — Speaking (Meet done + PDF uploaded, no evaluation yet)
        const roomStep3 = await tx.booking.create({
            data: {
                userId: student1.id,
                teacherId: teacherProfile2.id,
                availabilityId: roomSpkAv3.id,
                bundleId: bundleSpeaking.id,
                scheduledAt: new Date(
                    `${addDays(today, -5).toISOString().split("T")[0]}T13:00:00.000Z`,
                ),
                duration: 30,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
                meetLink: "https://meet.google.com/klm-nopq-rst",
            },
        });
        await tx.writingSubmission.create({
            data: {
                bookingId: roomStep3.id,
                filePath: "uploads/seed-writing-step3.pdf",
                fileName: "writing-task.pdf",
                fileSize: 204800,
            },
        });

        // Step 4 — Speaking with fullPrep bundle (fully completed: Meet + PDF + evaluation)
        const roomStep4 = await tx.booking.create({
            data: {
                userId: student2.id,
                teacherId: teacherProfile1.id,
                availabilityId: roomSpkAv4.id,
                bundleId: bundleFullPrep.id,
                scheduledAt: new Date(
                    `${addDays(today, -8).toISOString().split("T")[0]}T14:00:00.000Z`,
                ),
                duration: 45,
                status: BookingStatus.COMPLETED,
                paymentStatus: PaymentStatus.PAID,
                meetLink: "https://meet.google.com/uvw-xyza-bcd",
            },
        });
        await tx.writingSubmission.create({
            data: {
                bookingId: roomStep4.id,
                filePath: "uploads/seed-writing-step4.pdf",
                fileName: "ielts-writing-final.pdf",
                fileSize: 318000,
            },
        });
        await tx.evaluation.create({
            data: {
                bookingId: roomStep4.id,
                score: 7,
                feedback:
                    "Strong coherence and cohesion. Task achievement was good — the student addressed all parts of the prompt with relevant supporting detail. Lexical resource is above average. Minor grammatical range issues but overall a solid Band 7 performance.",
            },
        });

        // Step 5 — Writing-only (no upload yet, submission window open)
        const roomStep5 = await tx.booking.create({
            data: {
                userId: student3.id,
                teacherId: teacherProfile1.id,
                availabilityId: roomWrtAv1.id,
                bundleId: bundleWriting.id,
                scheduledAt: today,
                duration: 0,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
                submissionStart: today,
                submissionEnd: addDays(today, 3),
            },
        });

        // Step 6 — Writing-only (PDF uploaded, awaiting evaluation)
        const roomStep6 = await tx.booking.create({
            data: {
                userId: student1.id,
                teacherId: teacherProfile1.id,
                availabilityId: roomWrtAv2.id,
                bundleId: bundleWriting.id,
                scheduledAt: addDays(today, -2),
                duration: 0,
                status: BookingStatus.CONFIRMED,
                paymentStatus: PaymentStatus.PAID,
                submissionStart: addDays(today, -2),
                submissionEnd: today,
            },
        });
        await tx.writingSubmission.create({
            data: {
                bookingId: roomStep6.id,
                filePath: "uploads/seed-writing-step6.pdf",
                fileName: "writing-submission.pdf",
                fileSize: 172032,
            },
        });

        // Step 7 — Writing-only (fully evaluated)
        const roomStep7 = await tx.booking.create({
            data: {
                userId: student3.id,
                teacherId: teacherProfile2.id,
                availabilityId: roomWrtAv3.id,
                bundleId: bundleWriting.id,
                scheduledAt: addDays(today, -5),
                duration: 0,
                status: BookingStatus.COMPLETED,
                paymentStatus: PaymentStatus.PAID,
                submissionStart: addDays(today, -5),
                submissionEnd: addDays(today, -3),
            },
        });
        await tx.writingSubmission.create({
            data: {
                bookingId: roomStep7.id,
                filePath: "uploads/seed-writing-step7.pdf",
                fileName: "task1-task2-final.pdf",
                fileSize: 251904,
            },
        });
        await tx.evaluation.create({
            data: {
                bookingId: roomStep7.id,
                score: 6,
                feedback:
                    "Good attempt on both tasks. Task 1 response was informative but could benefit from a clearer overview. Task 2 argument was relevant but lacks full development in body paragraph 2. Band 6.5 is achievable with more practice on complex sentence structures.",
            },
        });

        // Surface IDs for manual testing (printed after transaction)
        Object.assign(globalThis, {
            __roomIds: {
                roomStep1: roomStep1.id,
                roomStep2: roomStep2.id,
                roomStep3: roomStep3.id,
                roomStep4: roomStep4.id,
                roomStep5: roomStep5.id,
                roomStep6: roomStep6.id,
                roomStep7: roomStep7.id,
            },
        });

        // --- Static pages ---
        await tx.staticPage.createMany({
            data: [
                {
                    title: "Terms & Conditions",
                    slug: "terms-and-conditions",
                    content:
                        "These are the terms and conditions for using ScoreMirror.\n\n1. By accessing this platform you agree to abide by these terms.\n2. All session recordings and materials are for personal use only.\n3. Cancellation and refund policies are outlined in the Cancellation Policy page.\n4. ScoreMirror reserves the right to update these terms at any time.",
                    isActive: true,
                },
                {
                    title: "About Us",
                    slug: "about-us",
                    content:
                        "ScoreMirror is an IELTS preparation platform that connects students with experienced instructors for 1-on-1 mock speaking tests, writing evaluations, and comprehensive performance reports.\n\nOur mission is to help every candidate walk into their IELTS exam already familiar with the experience.",
                    isActive: true,
                },
                {
                    title: "Privacy Policy",
                    slug: "privacy-policy",
                    content:
                        "Your privacy matters to us.\n\nWe collect only the information necessary to provide our services: name, email, and session data. We do not share your personal information with third parties without your consent.\n\nFor questions about your data, contact us at hello@scoremirror.test.",
                    isActive: true,
                },
            ],
        });

        void admin;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ids = (globalThis as any).__roomIds as Record<string, string>;
    console.log(
        "\nSeed completed: users, profiles, packages, bundles, enrollments, availability, bookings, class metadata, static pages, session room scenarios.",
    );
    console.log("\nSession Room test URLs (login as the matching student or teacher):");
    console.log(`  Speaking — Step 1  no Meet link       → /sessions/${ids.roomStep1}/room  [student1 / teacher1]`);
    console.log(`  Speaking — Step 2  Meet link set       → /sessions/${ids.roomStep2}/room  [student2 / teacher2]`);
    console.log(`  Speaking — Step 3  PDF uploaded        → /sessions/${ids.roomStep3}/room  [student1 / teacher2]`);
    console.log(`  Speaking — Step 4  Fully evaluated     → /sessions/${ids.roomStep4}/room  [student2 / teacher1]`);
    console.log(`  Writing  — Step 1  Fresh window        → /sessions/${ids.roomStep5}/room  [student3 / teacher1]`);
    console.log(`  Writing  — Step 2  PDF uploaded        → /sessions/${ids.roomStep6}/room  [student1 / teacher1]`);
    console.log(`  Writing  — Step 3  Fully evaluated     → /sessions/${ids.roomStep7}/room  [student3 / teacher2]`);
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
