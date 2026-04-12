import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import auth from "@/lib/auth/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";

const f = createUploadthing();

async function requireUploadMembership(groupId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new UploadThingError("Unauthorized");
  }

  const membership = await prisma.userGroup.findUnique({
    where: {
      userId_groupId: {
        userId: session.user.id,
        groupId,
      },
    },
  });

  if (!membership) {
    throw new UploadThingError("You are not a member of this group");
  }

  return {
    userId: session.user.id,
    userEmail: session.user.email,
    groupId,
  };
}

export const ourFileRouter = {
  attachmentUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 }
  })
    .input(z.object({
      groupId: z.string().min(1),
      slot: z.enum(["start", "end"]),
      taskId: z.string().min(1).optional(),
    }))

    .middleware(async ({ input }) => ({
      ...(await requireUploadMembership(input.groupId)),
      slot: input.slot,
      taskId: input.taskId,
    }))

    .onUploadComplete(async ({ metadata, file }) => {
      try {
        console.log("Upload complete for userId:", metadata.userId);

        const fileData = {
          id: crypto.randomUUID(),
          name: file.name,
          url: file.url,
          storageKey: file.key,
          groupId: metadata.groupId,
          userId: metadata.userId,
        };

        const uploadedFile =
          metadata.slot === "start"
            ? await prisma.startFile.create({
                data: fileData,
              })
            : await prisma.endFile.create({
                data: fileData,
              });

        return {
          uploadedBy: metadata.userId,
          url: file.url,
          fileId: uploadedFile.id,
          slot: metadata.slot,
          taskId: metadata.taskId ?? null,
        };
      } catch (error) {
        console.error("Failed to save file to DB:", error);
        throw new UploadThingError("Database saving failed");
      }
    }),
  groupMessageImageUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  })
    .input(z.object({
      groupId: z.string().min(1),
    }))
    .middleware(async ({ input }) => requireUploadMembership(input.groupId))
    .onUploadComplete(async ({ metadata, file }) => ({
      uploadedBy: metadata.userId,
      url: file.url,
      fileName: file.name,
      storageKey: file.key,
    })),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
