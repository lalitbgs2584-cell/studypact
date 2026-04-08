-- AlterTable
ALTER TABLE "group"
ADD COLUMN "inviteExpiresAt" TIMESTAMP(3),
ADD COLUMN "maxMembers" INTEGER NOT NULL DEFAULT 8;

UPDATE "group"
SET "inviteExpiresAt" = CURRENT_TIMESTAMP + INTERVAL '7 days'
WHERE "inviteExpiresAt" IS NULL;

ALTER TABLE "group"
ALTER COLUMN "inviteExpiresAt" SET NOT NULL;

-- AlterTable
ALTER TABLE "user_group"
ADD COLUMN "reputationScore" INTEGER NOT NULL DEFAULT 60;

-- AlterTable
ALTER TABLE "start_file"
ADD COLUMN "storageKey" TEXT;

-- AlterTable
ALTER TABLE "end_file"
ADD COLUMN "storageKey" TEXT;
