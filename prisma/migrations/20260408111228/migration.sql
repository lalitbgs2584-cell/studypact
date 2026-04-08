-- CreateTable
CREATE TABLE "group_message" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "userId" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,

    CONSTRAINT "group_message_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "group_message_groupId_createdAt_idx" ON "group_message"("groupId", "createdAt");

-- CreateIndex
CREATE INDEX "group_message_userId_createdAt_idx" ON "group_message"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "group_message" ADD CONSTRAINT "group_message_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_message" ADD CONSTRAINT "group_message_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "group"("id") ON DELETE CASCADE ON UPDATE CASCADE;
