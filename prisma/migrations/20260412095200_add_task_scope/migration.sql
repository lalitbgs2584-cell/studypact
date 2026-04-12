-- CreateEnum
CREATE TYPE "DisputeOutcome" AS ENUM ('PENALIZED', 'DISMISSED');

-- AlterTable
ALTER TABLE "submission_verification" ADD COLUMN     "disputeOutcome" "DisputeOutcome",
ADD COLUMN     "resolvedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "task" ADD COLUMN     "scope" "TaskScope" NOT NULL DEFAULT 'PERSONAL';
