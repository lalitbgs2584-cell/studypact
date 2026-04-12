-- CreateEnum
CREATE TYPE "CheckInReactionKind" AS ENUM ('FIRE', 'STRONG', 'THINKING', 'EYES');

-- CreateEnum
CREATE TYPE "MilestoneBadgeKind" AS ENUM ('FIRST_COMPLETION', 'STREAK_7', 'ZERO_PENALTIES_MONTH', 'EARLY_BIRD_10', 'REACTIONS_50');

-- CreateEnum
CREATE TYPE "RedemptionStatus" AS ENUM ('PENDING', 'SUBMITTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "check_in" ADD COLUMN     "isEarlyBird" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "task" ADD COLUMN     "earlyBirdCutoff" TIMESTAMP(3),
ADD COLUMN     "isChallengeMode" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "user_group" ADD COLUMN     "bestStreak" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "earlyBirdCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "check_in_reaction" (
    "id" TEXT NOT NULL,
    "kind" "CheckInReactionKind" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "checkInId" TEXT NOT NULL,

    CONSTRAINT "check_in_reaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_document" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "fileUrl" TEXT,
    "fileName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,

    CONSTRAINT "group_document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hall_of_fame" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "topUserId" TEXT NOT NULL,
    "bottomUserId" TEXT NOT NULL,
    "topName" TEXT NOT NULL,
    "bottomName" TEXT NOT NULL,
    "topStat" TEXT NOT NULL,
    "bottomStat" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hall_of_fame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_recap" (
    "id" TEXT NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "totalCompleted" INTEGER NOT NULL DEFAULT 0,
    "mvpUserId" TEXT,
    "mvpName" TEXT,
    "penaltyLeaderUserId" TEXT,
    "penaltyLeaderName" TEXT,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreakName" TEXT,
    "memberStats" JSONB NOT NULL,
    "groupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "weekly_recap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "milestone_badge" (
    "id" TEXT NOT NULL,
    "kind" "MilestoneBadgeKind" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "groupId" TEXT,

    CONSTRAINT "milestone_badge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confession_post" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "confession_post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "confession_upvote" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,
    "confessionId" TEXT NOT NULL,

    CONSTRAINT "confession_upvote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "redemption_task" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "status" "RedemptionStatus" NOT NULL DEFAULT 'PENDING',
    "startFileUrl" TEXT,
    "endFileUrl" TEXT,
    "reflection" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "penaltyEventId" TEXT,

    CONSTRAINT "redemption_task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_in_reaction_checkInId_idx" ON "check_in_reaction"("checkInId");

-- CreateIndex
CREATE INDEX "check_in_reaction_userId_idx" ON "check_in_reaction"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "check_in_reaction_checkInId_userId_kind_key" ON "check_in_reaction"("checkInId", "userId", "kind");

-- CreateIndex
CREATE INDEX "group_document_groupId_createdAt_idx" ON "group_document"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "hall_of_fame_groupId_weekStart_idx" ON "hall_of_fame"("groupId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "hall_of_fame_groupId_weekStart_key" ON "hall_of_fame"("groupId", "weekStart");

-- CreateIndex
CREATE INDEX "weekly_recap_groupId_weekStart_idx" ON "weekly_recap"("groupId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_recap_groupId_weekStart_key" ON "weekly_recap"("groupId", "weekStart");

-- CreateIndex
CREATE INDEX "milestone_badge_userId_idx" ON "milestone_badge"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "milestone_badge_userId_kind_groupId_key" ON "milestone_badge"("userId", "kind", "groupId");

-- CreateIndex
CREATE INDEX "confession_post_groupId_weekStart_idx" ON "confession_post"("groupId", "weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "confession_post_userId_groupId_weekStart_key" ON "confession_post"("userId", "groupId", "weekStart");

-- CreateIndex
CREATE INDEX "confession_upvote_confessionId_idx" ON "confession_upvote"("confessionId");

-- CreateIndex
CREATE UNIQUE INDEX "confession_upvote_confessionId_userId_key" ON "confession_upvote"("confessionId", "userId");

-- CreateIndex
CREATE INDEX "redemption_task_groupId_targetUserId_idx" ON "redemption_task"("groupId", "targetUserId");

-- CreateIndex
CREATE INDEX "redemption_task_targetUserId_idx" ON "redemption_task"("targetUserId");

-- AddForeignKey
ALTER TABLE "check_in_reaction" ADD CONSTRAINT "check_in_reaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in_reaction" ADD CONSTRAINT "check_in_reaction_checkInId_fkey" FOREIGN KEY ("checkInId") REFERENCES "check_in"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_document" ADD CONSTRAINT "group_document_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hall_of_fame" ADD CONSTRAINT "hall_of_fame_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_recap" ADD CONSTRAINT "weekly_recap_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestone_badge" ADD CONSTRAINT "milestone_badge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confession_post" ADD CONSTRAINT "confession_post_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confession_post" ADD CONSTRAINT "confession_post_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confession_upvote" ADD CONSTRAINT "confession_upvote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "confession_upvote" ADD CONSTRAINT "confession_upvote_confessionId_fkey" FOREIGN KEY ("confessionId") REFERENCES "confession_post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "redemption_task" ADD CONSTRAINT "redemption_task_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
