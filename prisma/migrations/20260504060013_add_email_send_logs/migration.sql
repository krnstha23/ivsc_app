-- CreateEnum
CREATE TYPE "email_send_type" AS ENUM ('BOOKING_CONFIRMED');

-- CreateEnum
CREATE TYPE "email_send_status" AS ENUM ('SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "email_send_trigger" AS ENUM ('BOOKING_CONFIRM', 'ADMIN_RESEND');

-- CreateTable
CREATE TABLE "email_send_logs" (
    "id" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "email_send_type" NOT NULL,
    "toEmail" TEXT NOT NULL,
    "status" "email_send_status" NOT NULL,
    "errorMessage" TEXT,
    "trigger" "email_send_trigger" NOT NULL,
    "triggeredByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_send_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_send_logs_bookingId_idx" ON "email_send_logs"("bookingId");

-- CreateIndex
CREATE INDEX "email_send_logs_userId_idx" ON "email_send_logs"("userId");

-- CreateIndex
CREATE INDEX "email_send_logs_createdAt_idx" ON "email_send_logs"("createdAt");

-- AddForeignKey
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "bookings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_send_logs" ADD CONSTRAINT "email_send_logs_triggeredByUserId_fkey" FOREIGN KEY ("triggeredByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
