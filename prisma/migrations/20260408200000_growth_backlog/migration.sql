-- CreateEnum
CREATE TYPE "GroupVisibility" AS ENUM ('PRIVATE', 'PUBLIC');

-- CreateEnum
CREATE TYPE "NotificationKind" AS ENUM ('PRE_DEADLINE_NUDGE', 'FLAGGED_SUBMISSION');

-- AlterTable
ALTER TABLE "group"
ADD COLUMN "visibility" "GroupVisibility" NOT NULL DEFAULT 'PRIVATE';

-- AlterTable
ALTER TABLE "user_group"
ADD COLUMN "inactivityStrikes" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "notification_log" (
    "id" TEXT NOT NULL,
    "kind" "NotificationKind" NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "taskDay" TIMESTAMP(3),
    "userId" TEXT NOT NULL,
    "groupId" TEXT,
    "checkInId" TEXT,

    CONSTRAINT "notification_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "notification_log_dedupeKey_key" ON "notification_log"("dedupeKey");

-- CreateIndex
CREATE INDEX "group_visibility_createdAt_idx" ON "group"("visibility", "createdAt");

-- CreateIndex
CREATE INDEX "notification_log_userId_sentAt_idx" ON "notification_log"("userId", "sentAt");

-- CreateIndex
CREATE INDEX "notification_log_groupId_sentAt_idx" ON "notification_log"("groupId", "sentAt");

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_log" ADD CONSTRAINT "notification_log_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE SET NULL ON UPDATE CASCADE;
