import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import auth from "@/lib/auth/auth";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { deleteUploadThingFile } from "@/lib/server/studypact";

const f = createUploadthing();

export const ourFileRouter = {
  attachmentUploader: f({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 }
  })
    .input(z.object({
      groupId: z.string().min(1),
      slot: z.enum(["start", "end"]),
    }))

    .middleware(async ({ input }) => {
      const session = await auth.api.getSession({
        headers: await headers(),
      });

      if (!session || !session.user) {
        throw new UploadThingError("Unauthorized");
      }

      const membership = await prisma.userGroup.findUnique({
        where: {
          userId_groupId: {
            userId: session.user.id,
            groupId: input.groupId,
          },
        },
      });

      if (!membership) {
        throw new UploadThingError("You are not a member of this group");
      }

      return {
        userId: session.user.id,
        userEmail: session.user.email,
        groupId: input.groupId,
        slot: input.slot,
      };
    })

    .onUploadComplete(async ({ metadata, file }) => {
      try {
        console.log("Upload complete for userId:", metadata.userId);

        const existingDraft =
          metadata.slot === "start"
            ? await prisma.startFile.findFirst({
                where: {
                  userId: metadata.userId,
                  groupId: metadata.groupId,
                  checkInId: null,
                },
                orderBy: {
                  uploadedAt: "desc",
                },
              })
            : await prisma.endFile.findFirst({
                where: {
                  userId: metadata.userId,
                  groupId: metadata.groupId,
                  checkInId: null,
                },
                orderBy: {
                  uploadedAt: "desc",
                },
              });

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

        if (existingDraft) {
          await deleteUploadThingFile(existingDraft.storageKey);

          if (metadata.slot === "start") {
            await prisma.startFile.delete({
              where: {
                id: existingDraft.id,
              },
            });
          } else {
            await prisma.endFile.delete({
              where: {
                id: existingDraft.id,
              },
            });
          }
        }

        return {
          uploadedBy: metadata.userId,
          url: file.url,
          fileId: uploadedFile.id,
          slot: metadata.slot,
        };
      } catch (error) {
        console.error("Failed to save file to DB:", error);
        throw new UploadThingError("Database saving failed");
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
