"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import auth from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma/client";
import {
  deleteUploadThingFile,
  ensureRecurringTasksForUser,
  getInviteLinkState,
  platformResolveCheckIn,
  refreshMembershipReputation,
  requireGroupMembership,
  resolveCheckInAfterVerification,
  sendFlaggedSubmissionAlert,
  syncMissedCheckInPenalties,
} from "@/lib/server/studypact";
import {
  evaluateProofSubmission,
  extractInviteToken,
  getInviteExpiryDate,
  randomInviteCode,
  startOfDay,
} from "@/lib/studypact";

async function getCurrentUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Unauthorized");
  }

  if (session.user.isBlocked) {
    throw new Error("This account has been blocked");
  }

  return session.user;
}

async function getRequestOrigin() {
  const requestHeaders = await headers();
  const origin = requestHeaders.get("origin");
  if (origin) {
    return origin;
  }

  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";
  return `${protocol}://${host}`;
}

export async function requirePlatformAdmin() {
  const user = await getCurrentUser();
  if (user.role !== "admin") {
    throw new Error("Admin access required");
  }
  return user;
}

async function refreshAppSurfaces(groupId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/tasks");
  revalidatePath("/groups/create");
  revalidatePath("/groups/discover");
  if (groupId) {
    revalidatePath(`/group/${groupId}/feed`);
    revalidatePath(`/group/${groupId}/ledger`);
    revalidatePath(`/group/${groupId}/checkin`);
    revalidatePath(`/group/${groupId}/gallery`);
  }
}

export async function createGroupAction(formData: FormData) {
  try {
    const user = await getCurrentUser();
    const name = String(formData.get("name") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const link = String(formData.get("link") || "").trim();
    const dailyPenaltyValue = Number(formData.get("dailyPenalty") || 10);
    const maxMembersValue = Number(formData.get("maxMembers") || 8);
    const inviteExpiresInDaysValue = Number(formData.get("inviteExpiresInDays") || 7);
    const visibilityValue = String(formData.get("visibility") || "PRIVATE").toUpperCase();
    const focusTypeValue = String(formData.get("focusType") || "GENERAL").toUpperCase();
    const taskPostingModeValue = String(formData.get("taskPostingMode") || "ALL_MEMBERS").toUpperCase();
    const penaltyModeValue = String(formData.get("penaltyMode") || "BURN").toUpperCase();

    if (!name) {
      return { success: false, error: "Group name is required" };
    }

    const dailyPenalty =
      Number.isFinite(dailyPenaltyValue) && dailyPenaltyValue >= 0
        ? Math.floor(dailyPenaltyValue)
        : 10;

    const maxMembers =
      Number.isFinite(maxMembersValue) && maxMembersValue >= 2
        ? Math.floor(maxMembersValue)
        : 8;

    const inviteExpiresInDays =
      Number.isFinite(inviteExpiresInDaysValue) && inviteExpiresInDaysValue >= 1
        ? Math.floor(inviteExpiresInDaysValue)
        : 7;
    const visibility = visibilityValue === "PUBLIC" ? "PUBLIC" : "PRIVATE";
    const focusType = ["GENERAL", "DSA", "DEVELOPMENT", "EXAM_PREP", "MACHINE_LEARNING", "CUSTOM"].includes(focusTypeValue)
      ? focusTypeValue as "GENERAL" | "DSA" | "DEVELOPMENT" | "EXAM_PREP" | "MACHINE_LEARNING" | "CUSTOM"
      : "GENERAL";
    const taskPostingMode = taskPostingModeValue === "ADMINS_ONLY" ? "ADMINS_ONLY" : "ALL_MEMBERS";
    const penaltyMode = penaltyModeValue === "POOL" ? "POOL" : "BURN";

    let createdGroup:
      | {
          id: string;
          inviteCode: string;
          inviteExpiresAt: Date;
        }
      | null = null;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const inviteCode = randomInviteCode();

      try {
        createdGroup = await prisma.$transaction(async (tx) => {
          const group = await tx.group.create({
            data: {
              name,
              description: description || null,
              link: link || null,
              dailyPenalty,
              maxMembers,
              visibility,
              focusType,
              taskPostingMode,
              penaltyMode,
              inviteCode,
              inviteExpiresAt: getInviteExpiryDate(inviteExpiresInDays),
              createdById: user.id,
            },
          });

          await tx.userGroup.create({
            data: {
              userId: user.id,
              groupId: group.id,
              role: "admin",
            },
          });

          return {
            id: group.id,
            inviteCode: group.inviteCode,
            inviteExpiresAt: group.inviteExpiresAt,
          };
        });

        break;
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          continue;
        }

        throw error;
      }
    }

    if (!createdGroup) {
      return {
        success: false,
        error: "Could not generate a unique invite code. Please try again.",
      };
    }

    await refreshMembershipReputation(user.id, createdGroup.id);
    await refreshAppSurfaces(createdGroup.id);

    return {
      success: true,
      inviteCode: createdGroup.inviteCode,
      invitePath: `/join/${createdGroup.inviteCode}`,
      inviteExpiresAt: createdGroup.inviteExpiresAt.toISOString(),
      groupId: createdGroup.id,
      visibility,
      focusType,
      taskPostingMode,
      penaltyMode,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create group",
    };
  }
}

export async function createGroupFromInput(input: {
  name: string;
  description?: string;
  link?: string;
  dailyPenalty?: number;
  maxMembers?: number;
  inviteExpiresInDays?: number;
  visibility?: "PRIVATE" | "PUBLIC";
  focusType?: "GENERAL" | "DSA" | "DEVELOPMENT" | "EXAM_PREP" | "MACHINE_LEARNING" | "CUSTOM";
  taskPostingMode?: "ADMINS_ONLY" | "ALL_MEMBERS";
  penaltyMode?: "BURN" | "POOL";
}) {
  const formData = new FormData();
  formData.set("name", input.name);
  if (input.description) formData.set("description", input.description);
  if (input.link) formData.set("link", input.link);
  if (input.dailyPenalty !== undefined) formData.set("dailyPenalty", String(input.dailyPenalty));
  if (input.maxMembers !== undefined) formData.set("maxMembers", String(input.maxMembers));
  if (input.inviteExpiresInDays !== undefined) {
    formData.set("inviteExpiresInDays", String(input.inviteExpiresInDays));
  }
  if (input.visibility) formData.set("visibility", input.visibility);
  if (input.focusType) formData.set("focusType", input.focusType);
  if (input.taskPostingMode) formData.set("taskPostingMode", input.taskPostingMode);
  if (input.penaltyMode) formData.set("penaltyMode", input.penaltyMode);
  return createGroupAction(formData);
}

export async function joinGroupAction(inviteToken: string) {
  const user = await getCurrentUser();
  const normalizedToken = extractInviteToken(inviteToken);
  const inviteState = await getInviteLinkState(normalizedToken, user.id);

  if (inviteState.status === "missing") {
    return { success: false, error: "Invite link not found" };
  }

  if (inviteState.status === "expired") {
    return { success: false, error: "This invite link has expired" };
  }

  if (inviteState.status === "full") {
    return { success: false, error: "This group is already full" };
  }

  if (inviteState.status === "already-member" && inviteState.group) {
    return { success: true, groupId: inviteState.group.id };
  }

  if (!inviteState.group) {
    return { success: false, error: "Invite link not found" };
  }

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId: inviteState.group.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      groupId: inviteState.group.id,
      role: "member",
    },
  });

  await refreshMembershipReputation(user.id, inviteState.group.id);
  await ensureRecurringTasksForUser(user.id);
  await refreshAppSurfaces(inviteState.group.id);
  return { success: true, groupId: inviteState.group.id };
}

export async function joinGroupByCodeAction(inviteCodeOrUrl: string) {
  const value = inviteCodeOrUrl.trim();

  if (!value) {
    return { success: false, error: "Paste an invite code or full invite link" };
  }

  return joinGroupAction(value);
}

export async function joinPublicGroupAction(groupId: string) {
  const user = await getCurrentUser();
  const group = await prisma.group.findUnique({
    where: {
      id: groupId,
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!group || group.visibility !== "PUBLIC") {
    return { success: false, error: "This public group is no longer available" };
  }

  if (group._count.users >= group.maxMembers) {
    return { success: false, error: "This group is already full" };
  }

  await prisma.userGroup.upsert({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId,
      },
    },
    update: {},
    create: {
      userId: user.id,
      groupId,
      role: "member",
    },
  });

  await refreshMembershipReputation(user.id, groupId);
  await ensureRecurringTasksForUser(user.id);
  await refreshAppSurfaces(groupId);
  return { success: true, groupId };
}

export async function createTaskAction(input: {
  groupId: string;
  title: string;
  details?: string;
  category?: "DSA" | "DEVELOPMENT" | "REVISION" | "INTERVIEW_PREP" | "READING" | "CUSTOM";
  targetMinutes?: number;
  isRecurring?: boolean;
  scope?: "PERSONAL" | "GROUP";
}) {
  const user = await getCurrentUser();
  const membership = await requireGroupMembership(user.id, input.groupId);

  const title = input.title.trim();
  if (!title) {
    throw new Error("Task title is required");
  }

  const today = startOfDay();
  const scope = input.scope === "GROUP" ? "GROUP" : "PERSONAL";
  const category = ["DSA", "DEVELOPMENT", "REVISION", "INTERVIEW_PREP", "READING", "CUSTOM"].includes(
    input.category || "",
  )
    ? (input.category as "DSA" | "DEVELOPMENT" | "REVISION" | "INTERVIEW_PREP" | "READING" | "CUSTOM")
    : "CUSTOM";
  const targetMinutes =
    input.targetMinutes && Number.isFinite(input.targetMinutes) && input.targetMinutes > 0
      ? Math.floor(input.targetMinutes)
      : null;

  if (
    scope === "GROUP" &&
    membership.role !== "admin" &&
    membership.group.taskPostingMode !== "ALL_MEMBERS"
  ) {
    throw new Error("Only admins can post checklist items for the whole group");
  }

  let templateId: string | null = null;
  if (input.isRecurring) {
    const existingTemplate = await prisma.taskTemplate.findFirst({
      where: {
        groupId: input.groupId,
        isActive: true,
        scope,
        userId: scope === "PERSONAL" ? user.id : null,
        title,
        category,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const template = existingTemplate
      ? await prisma.taskTemplate.update({
          where: { id: existingTemplate.id },
          data: {
            details: input.details?.trim() || null,
            targetMinutes,
            createdById: user.id,
          },
        })
      : await prisma.taskTemplate.create({
          data: {
            title,
            details: input.details?.trim() || null,
            category,
            targetMinutes,
            scope,
            userId: scope === "PERSONAL" ? user.id : null,
            groupId: input.groupId,
            createdById: user.id,
          },
        });

    templateId = template.id;
  }

  if (scope === "GROUP") {
    const memberIds = (
      await prisma.userGroup.findMany({
        where: { groupId: input.groupId },
        select: { userId: true },
      })
    ).map((member) => member.userId);

    const existingTasks = await prisma.task.findMany({
      where: {
        groupId: input.groupId,
        day: today,
        userId: {
          in: memberIds,
        },
        ...(templateId
          ? {
              templateId,
            }
          : {
              title,
              category,
            }),
      },
      select: {
        id: true,
        userId: true,
        title: true,
        groupId: true,
      },
    });

    const existingUserIds = new Set(existingTasks.map((task) => task.userId));
    const tasksToCreate = memberIds
      .filter((memberId) => !existingUserIds.has(memberId))
      .map((memberId) => ({
        title,
        details: input.details?.trim() || null,
        category,
        targetMinutes,
        groupId: input.groupId,
        userId: memberId,
        day: today,
        templateId,
      }));

    if (tasksToCreate.length) {
      await prisma.task.createMany({
        data: tasksToCreate,
      });
    }

    const visibleTask =
      existingTasks.find((task) => task.userId === user.id) ??
      (await prisma.task.findFirst({
        where: {
          groupId: input.groupId,
          userId: user.id,
          day: today,
          ...(templateId
            ? {
                templateId,
              }
            : {
                title,
                category,
              }),
        },
        orderBy: {
          createdAt: "desc",
        },
      }));

    await refreshAppSurfaces(input.groupId);
    return {
      id: visibleTask?.id || crypto.randomUUID(),
      title,
      groupId: input.groupId,
      category,
      createdCount: tasksToCreate.length,
      scope,
    };
  }

  const task = await prisma.task.create({
    data: {
      title,
      details: input.details?.trim() || null,
      category,
      targetMinutes,
      groupId: input.groupId,
      userId: user.id,
      day: today,
      templateId,
    },
  });

  await refreshAppSurfaces(input.groupId);
  return {
    id: task.id,
    title: task.title,
    groupId: task.groupId,
    category: task.category,
    createdCount: 1,
    scope,
  };
}

export async function toggleTaskAction(input: { taskId: string; completed: boolean }) {
  const user = await getCurrentUser();

  const task = await prisma.task.findUnique({
    where: { id: input.taskId },
  });

  if (!task || task.userId !== user.id) {
    throw new Error("Task not found");
  }

  await prisma.task.update({
    where: { id: input.taskId },
    data: {
      status: input.completed ? "COMPLETED" : "PENDING",
      completedAt: input.completed ? new Date() : null,
    },
  });

  await refreshAppSurfaces(task.groupId);
}

export async function deleteTaskAction(taskId: string) {
  const user = await getCurrentUser();

  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task || task.userId !== user.id) {
    throw new Error("Task not found");
  }

  await prisma.task.delete({
    where: { id: taskId },
  });

  await refreshAppSurfaces(task.groupId);
}

export async function submitCheckInAction(input: {
  groupId: string;
  reflection?: string;
  proofText?: string;
  proofLink?: string;
  startFileId: string;
  endFileId: string;
}) {
  const user = await getCurrentUser();
  const membership = await requireGroupMembership(user.id, input.groupId);

  const today = startOfDay();
  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      groupId: input.groupId,
      day: today,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!tasks.length) {
    throw new Error("Add your daily tasks before submitting a check-in");
  }

  const [startFile, endFile, existingCheckIn] = await Promise.all([
    prisma.startFile.findUnique({ where: { id: input.startFileId } }),
    prisma.endFile.findUnique({ where: { id: input.endFileId } }),
    prisma.checkIn.findFirst({
      where: {
        userId: user.id,
        groupId: input.groupId,
        day: today,
      },
      include: {
        penalties: true,
        verifications: true,
        startFiles: true,
        endFiles: true,
      },
    }),
  ]);

  if (!startFile || startFile.userId !== user.id || startFile.groupId !== input.groupId) {
    throw new Error("Start proof is invalid");
  }

  if (!endFile || endFile.userId !== user.id || endFile.groupId !== input.groupId) {
    throw new Error("End proof is invalid");
  }

  if (existingCheckIn?.status === "APPROVED") {
    throw new Error("Today's check-in has already been approved");
  }

  const replacedStartFiles = existingCheckIn?.startFiles.filter((file) => file.id !== startFile.id) ?? [];
  const replacedEndFiles = existingCheckIn?.endFiles.filter((file) => file.id !== endFile.id) ?? [];
  const penaltyCountToReverse = existingCheckIn?.penalties.length ?? 0;
  const totalPenaltyToReverse = existingCheckIn?.penalties.reduce((sum, penalty) => sum + penalty.points, 0) ?? 0;
  const missesToReverse = Math.min(membership.misses, penaltyCountToReverse);
  const completedTaskCount = tasks.filter((task) => task.status === "COMPLETED").length;
  const aiReview = evaluateProofSubmission({
    reflection: input.reflection,
    proofText: input.proofText,
    proofLink: input.proofLink,
    completedTaskCount,
    totalTaskCount: tasks.length,
  });

  const checkIn = await prisma.$transaction(async (tx) => {
    const nextCheckIn = existingCheckIn
      ? await tx.checkIn.update({
          where: { id: existingCheckIn.id },
          data: {
            reflection: input.reflection?.trim() || null,
            proofText: input.proofText?.trim() || null,
            proofLink: input.proofLink?.trim() || null,
            aiSummary: aiReview.summary,
            aiConfidence: aiReview.confidence,
            status: "PENDING",
            verifiedAt: null,
            pointsAwarded: 0,
            penaltyApplied: 0,
          },
        })
      : await tx.checkIn.create({
          data: {
            userId: user.id,
            groupId: input.groupId,
            day: today,
            reflection: input.reflection?.trim() || null,
            proofText: input.proofText?.trim() || null,
            proofLink: input.proofLink?.trim() || null,
            aiSummary: aiReview.summary,
            aiConfidence: aiReview.confidence,
            status: "PENDING",
          },
        });

    await Promise.all([
      tx.task.updateMany({
        where: {
          id: {
            in: tasks.map((task) => task.id),
          },
        },
        data: {
          checkInId: nextCheckIn.id,
        },
      }),
      tx.startFile.update({
        where: { id: startFile.id },
        data: {
          checkInId: nextCheckIn.id,
        },
      }),
      tx.endFile.update({
        where: { id: endFile.id },
        data: {
          checkInId: nextCheckIn.id,
        },
      }),
      tx.submissionVerification.deleteMany({
        where: {
          checkInId: nextCheckIn.id,
        },
      }),
    ]);

    if (existingCheckIn?.penalties.length) {
      await tx.penaltyEvent.deleteMany({
        where: {
          checkInId: nextCheckIn.id,
        },
      });

      await tx.user.update({
        where: {
          id: user.id,
        },
        data: {
          penaltyCount: {
            decrement: penaltyCountToReverse,
          },
        },
      });

      await tx.userGroup.update({
        where: {
          userId_groupId: {
            userId: user.id,
            groupId: input.groupId,
          },
        },
        data: {
          points: {
            increment: totalPenaltyToReverse,
          },
          misses: missesToReverse
            ? {
                decrement: missesToReverse,
              }
            : undefined,
        },
      });
    }

    return nextCheckIn;
  });

  for (const file of replacedStartFiles) {
    await deleteUploadThingFile(file.storageKey);
    await prisma.startFile.delete({
      where: {
        id: file.id,
      },
    });
  }

  for (const file of replacedEndFiles) {
    await deleteUploadThingFile(file.storageKey);
    await prisma.endFile.delete({
      where: {
        id: file.id,
      },
    });
  }

  await refreshMembershipReputation(user.id, input.groupId);
  await refreshAppSurfaces(input.groupId);
  return { success: true, checkInId: checkIn.id };
}

export async function verifyCheckInAction(input: {
  checkInId: string;
  verdict: "APPROVE" | "FLAG";
  note?: string;
}) {
  const user = await getCurrentUser();

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: input.checkInId,
    },
    include: {
      group: {
        include: {
          _count: {
            select: {
              users: true,
            },
          },
        },
      },
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  if (checkIn.userId === user.id) {
    throw new Error("You cannot verify your own submission");
  }

  await requireGroupMembership(user.id, checkIn.groupId);

  await prisma.submissionVerification.upsert({
    where: {
      checkInId_reviewerId: {
        checkInId: checkIn.id,
        reviewerId: user.id,
      },
    },
    update: {
      verdict: input.verdict,
      note: input.note?.trim() || null,
    },
    create: {
      checkInId: checkIn.id,
      reviewerId: user.id,
      verdict: input.verdict,
      note: input.note?.trim() || null,
    },
  });

  await resolveCheckInAfterVerification(checkIn.id);
  if (input.verdict === "FLAG") {
    await sendFlaggedSubmissionAlert(checkIn.id);
  }
  await refreshAppSurfaces(checkIn.groupId);
}

export async function adminResolveCheckInAction(input: {
  checkInId: string;
  verdict: "APPROVE" | "FLAG";
}) {
  await requirePlatformAdmin();

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: input.checkInId,
    },
    select: {
      id: true,
      groupId: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  await platformResolveCheckIn(checkIn.id, input.verdict);
  await refreshAppSurfaces(checkIn.groupId);
}

export async function rotateGroupInviteCodeAction(groupId: string) {
  const user = await getCurrentUser();
  const membership = await requireGroupMembership(user.id, groupId);

  if (membership.role !== "admin" && user.role !== "admin") {
    throw new Error("Only admins can rotate invite links");
  }

  let group:
    | {
        id: string;
        inviteCode: string;
        inviteExpiresAt: Date;
      }
    | null = null;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      group = await prisma.group.update({
        where: {
          id: groupId,
        },
        data: {
          inviteCode: randomInviteCode(),
          inviteExpiresAt: getInviteExpiryDate(7),
        },
        select: {
          id: true,
          inviteCode: true,
          inviteExpiresAt: true,
        },
      });
      break;
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        continue;
      }

      throw error;
    }
  }

  if (!group) {
    throw new Error("Could not rotate invite link right now");
  }

  await refreshAppSurfaces(group.id);
}

export async function setUserBlockedStatusAction(input: {
  userId: string;
  isBlocked: boolean;
}) {
  await requirePlatformAdmin();

  await prisma.user.update({
    where: {
      id: input.userId,
    },
    data: {
      isBlocked: input.isBlocked,
    },
  });

  revalidatePath("/admin");
}

export async function createGroupMessageAction(input: {
  groupId: string;
  content?: string;
  imageUrl?: string;
  imageName?: string;
  imageStorageKey?: string;
}) {
  const user = await getCurrentUser();
  await requireGroupMembership(user.id, input.groupId);

  const content = input.content?.trim() || null;
  const imageUrl = input.imageUrl?.trim() || null;
  const imageName = input.imageName?.trim() || null;
  const imageStorageKey = input.imageStorageKey?.trim() || null;

  if (!content && !imageUrl) {
    throw new Error("Add a message or upload a photo");
  }

  await prisma.groupMessage.create({
    data: {
      groupId: input.groupId,
      userId: user.id,
      content,
      imageUrl,
      imageName,
      imageStorageKey,
    },
  });

  await refreshAppSurfaces(input.groupId);
}

export async function toggleGroupMessageReactionAction(input: {
  messageId: string;
  kind: "FIRE" | "CLAP" | "TARGET" | "ROCKET";
}) {
  const user = await getCurrentUser();
  const message = await prisma.groupMessage.findUnique({
    where: {
      id: input.messageId,
    },
    select: {
      id: true,
      groupId: true,
    },
  });

  if (!message) {
    throw new Error("Message not found");
  }

  await requireGroupMembership(user.id, message.groupId);

  const existingReaction = await prisma.groupMessageReaction.findFirst({
    where: {
      messageId: input.messageId,
      userId: user.id,
      kind: input.kind,
    },
    select: {
      id: true,
    },
  });

  if (existingReaction) {
    await prisma.groupMessageReaction.delete({
      where: {
        id: existingReaction.id,
      },
    });
  } else {
    await prisma.groupMessageReaction.create({
      data: {
        messageId: input.messageId,
        userId: user.id,
        kind: input.kind,
      },
    });
  }

  await refreshAppSurfaces(message.groupId);
}

export async function requestPasswordResetAction(input: { email: string; redirectTo?: string }) {
  const email = input.email.trim().toLowerCase();

  if (!email) {
    return { success: false, error: "Email is required" };
  }

  try {
    const origin = await getRequestOrigin();
    await auth.api.requestPasswordReset({
      headers: await headers(),
      body: {
        email,
        redirectTo: input.redirectTo || `${origin}/reset-password`,
      },
    });

    return {
      success: true,
      message: "If that email exists, a password reset link has been sent.",
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not send reset email",
    };
  }
}

export async function resetPasswordAction(input: {
  token: string;
  newPassword: string;
  confirmPassword: string;
}) {
  if (!input.token.trim()) {
    return { success: false, error: "Reset token is missing" };
  }

  if (input.newPassword.length < 8) {
    return { success: false, error: "Password must be at least 8 characters long" };
  }

  if (input.newPassword !== input.confirmPassword) {
    return { success: false, error: "Passwords do not match" };
  }

  try {
    await auth.api.resetPassword({
      headers: await headers(),
      body: {
        token: input.token,
        newPassword: input.newPassword,
      },
    });

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not reset password",
    };
  }
}

export async function syncUserVisibleGroups() {
  const user = await getCurrentUser();
  const memberships = await prisma.userGroup.findMany({
    where: { userId: user.id },
    select: { groupId: true },
  });

  for (const membership of memberships) {
    await syncMissedCheckInPenalties({ groupId: membership.groupId });
  }
}

export async function syncGroupPenaltyLedger(groupId: string) {
  const user = await getCurrentUser();
  await requireGroupMembership(user.id, groupId);
  await syncMissedCheckInPenalties({ groupId });
}
