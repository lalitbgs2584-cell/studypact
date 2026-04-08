/*
  Warnings:

  - A unique constraint covering the columns `[inviteCode]` on the table `group` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `createdById` to the `group` table without a default value. This is not possible if the table is not empty.
  - Added the required column `inviteCode` to the `group` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'COMPLETED', 'MISSED');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('PENDING', 'APPROVED', 'FLAGGED', 'REJECTED');

-- CreateEnum
CREATE TYPE "VerificationVerdict" AS ENUM ('APPROVE', 'FLAG');

-- AlterTable
ALTER TABLE "end_file" ADD COLUMN     "checkInId" TEXT;

-- AlterTable
ALTER TABLE "group" ADD COLUMN     "createdById" TEXT NOT NULL,
ADD COLUMN     "dailyPenalty" INTEGER NOT NULL DEFAULT 10,
ADD COLUMN     "inviteCode" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "start_file" ADD COLUMN     "checkInId" TEXT;

-- AlterTable
ALTER TABLE "user_group" ADD COLUMN     "completions" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastCheckInAt" TIMESTAMP(3),
ADD COLUMN     "misses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "streak" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "role" SET DEFAULT 'member';

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "status" "TaskStatus" NOT NULL DEFAULT 'PENDING',
    "day" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "checkInId" TEXT,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "check_in" (
    "id" TEXT NOT NULL,
    "day" TIMESTAMP(3) NOT NULL,
    "reflection" TEXT,
    "proofText" TEXT,
    "status" "CheckInStatus" NOT NULL DEFAULT 'PENDING',
    "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
    "penaltyApplied" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submission_verification" (
    "id" TEXT NOT NULL,
    "verdict" "VerificationVerdict" NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkInId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,

    CONSTRAINT "submission_verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "penalty_event" (
    "id" TEXT NOT NULL,
    "points" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "checkInId" TEXT,

    CONSTRAINT "penalty_event_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "task_userId_day_idx" ON "task"("userId", "day");

-- CreateIndex
CREATE INDEX "task_groupId_day_idx" ON "task"("groupId", "day");

-- CreateIndex
CREATE INDEX "check_in_groupId_day_idx" ON "check_in"("groupId", "day");

-- CreateIndex
CREATE INDEX "check_in_userId_day_idx" ON "check_in"("userId", "day");

-- CreateIndex
CREATE INDEX "submission_verification_checkInId_idx" ON "submission_verification"("checkInId");

-- CreateIndex
CREATE INDEX "submission_verification_reviewerId_idx" ON "submission_verification"("reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "submission_verification_checkInId_reviewerId_key" ON "submission_verification"("checkInId", "reviewerId");

-- CreateIndex
CREATE INDEX "penalty_event_groupId_createdAt_idx" ON "penalty_event"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "penalty_event_userId_createdAt_idx" ON "penalty_event"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "end_file_groupId_idx" ON "end_file"("groupId");

-- CreateIndex
CREATE UNIQUE INDEX "group_inviteCode_key" ON "group"("inviteCode");

-- CreateIndex
CREATE INDEX "group_createdById_idx" ON "group"("createdById");

-- CreateIndex
CREATE INDEX "start_file_groupId_idx" ON "start_file"("groupId");

-- AddForeignKey
ALTER TABLE "group" ADD CONSTRAINT "group_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_verification" ADD CONSTRAINT "submission_verification_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "submission_verification" ADD CONSTRAINT "submission_verification_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_event" ADD CONSTRAINT "penalty_event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_event" ADD CONSTRAINT "penalty_event_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "penalty_event" ADD CONSTRAINT "penalty_event_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "start_file" ADD CONSTRAINT "start_file_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "end_file" ADD CONSTRAINT "end_file_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE SET NULL ON UPDATE CASCADE;
