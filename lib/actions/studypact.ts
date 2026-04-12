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
  leaderResolveCheckIn,
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
  revalidatePath("/uploads");
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
  isChallengeMode?: boolean;
  earlyBirdCutoff?: string; // "HH:MM" 24h format
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

  // Parse "HH:MM" cutoff into a full Date on today's date
  let earlyBirdCutoff: Date | null = null;
  if (input.earlyBirdCutoff && scope === "GROUP") {
    const [hh, mm] = input.earlyBirdCutoff.split(":").map(Number);
    if (Number.isFinite(hh) && Number.isFinite(mm)) {
      const cutoffDate = startOfDay();
      cutoffDate.setHours(hh, mm, 0, 0);
      earlyBirdCutoff = cutoffDate;
    }
  }

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
        isChallengeMode: scope === "GROUP" ? Boolean(input.isChallengeMode) : false,
        earlyBirdCutoff,
        scope: scope as "PERSONAL" | "GROUP",
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
      isChallengeMode: Boolean(input.isChallengeMode),
      earlyBirdCutoff,
      scope,
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
  startFileId?: string;
  endFileId?: string;
  taskProofs?: { taskId: string; startFileId: string; endFileId: string }[];
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
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      status: true,
      checkInId: true,
      earlyBirdCutoff: true,
    },
  });

  if (!tasks.length) {
    throw new Error("Add your daily tasks before submitting a check-in");
  }

  const taskIds = new Set(tasks.map((task) => task.id));
  const normalizedTaskProofs =
    input.taskProofs?.length
      ? input.taskProofs.filter(
          (taskProof) =>
            taskIds.has(taskProof.taskId) &&
            taskProof.startFileId.trim() &&
            taskProof.endFileId.trim(),
        )
      : input.startFileId && input.endFileId
        ? [
            {
              taskId: tasks[0]?.id ?? "",
              startFileId: input.startFileId,
              endFileId: input.endFileId,
            },
          ]
        : [];

  if (!normalizedTaskProofs.length) {
    throw new Error("Upload both start and end proof for at least one task before submitting.");
  }

  const startFileIds = [...new Set(normalizedTaskProofs.map((taskProof) => taskProof.startFileId))];
  const endFileIds = [...new Set(normalizedTaskProofs.map((taskProof) => taskProof.endFileId))];

  const [startFiles, endFiles, existingCheckIn] = await Promise.all([
    prisma.startFile.findMany({ where: { id: { in: startFileIds } } }),
    prisma.endFile.findMany({ where: { id: { in: endFileIds } } }),
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

  if (startFiles.length !== startFileIds.length) {
    throw new Error("One or more start proofs are invalid");
  }

  if (endFiles.length !== endFileIds.length) {
    throw new Error("One or more end proofs are invalid");
  }

  const invalidStartProof = startFiles.find((file) => file.userId !== user.id || file.groupId !== input.groupId);
  if (invalidStartProof) {
    throw new Error("Start proof is invalid");
  }

  const invalidEndProof = endFiles.find((file) => file.userId !== user.id || file.groupId !== input.groupId);
  if (invalidEndProof) {
    throw new Error("End proof is invalid");
  }

  if (existingCheckIn?.status === "APPROVED") {
    throw new Error("Today's check-in has already been approved");
  }

  const activeStartFileIds = new Set(startFileIds);
  const activeEndFileIds = new Set(endFileIds);
  const replacedStartFiles = existingCheckIn?.startFiles.filter((file) => !activeStartFileIds.has(file.id)) ?? [];
  const replacedEndFiles = existingCheckIn?.endFiles.filter((file) => !activeEndFileIds.has(file.id)) ?? [];
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

  const now = new Date();
  const cutoff = tasks.find((t) => t.earlyBirdCutoff)?.earlyBirdCutoff ?? null;
  const isEarlyBird = cutoff !== null && now <= cutoff;

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
            isEarlyBird,
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
            isEarlyBird,
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
      tx.startFile.updateMany({
        where: { id: { in: startFileIds } },
        data: {
          checkInId: nextCheckIn.id,
        },
      }),
      tx.endFile.updateMany({
        where: { id: { in: endFileIds } },
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
  return { success: true, checkInId: checkIn.id, proofCount: normalizedTaskProofs.length };
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

  const resolution = await resolveCheckInAfterVerification(checkIn.id);
  if (input.verdict === "FLAG") {
    await sendFlaggedSubmissionAlert(checkIn.id);
  }
  await refreshAppSurfaces(checkIn.groupId);

  return {
    success: true,
    resolved: resolution.resolved,
    verdict: resolution.status,
    penaltyApplied: resolution.status === "REJECTED",
    sentToLeader: resolution.status === "FLAGGED",
  };
}

export async function leaderResolveCheckInAction(input: {
  checkInId: string;
  verdict: "APPROVE" | "REJECT";
}) {
  const user = await getCurrentUser();

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: input.checkInId,
    },
    select: {
      id: true,
      groupId: true,
      status: true,
      group: {
        select: {
          createdById: true,
        },
      },
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  const membership = await requireGroupMembership(user.id, checkIn.groupId);
  if (membership.role !== "admin" || checkIn.group.createdById !== user.id) {
    throw new Error("Only the group leader can resolve escalated uploads");
  }

  const status = await leaderResolveCheckIn(checkIn.id, input.verdict);
  await refreshAppSurfaces(checkIn.groupId);

  return {
    success: true,
    status,
  };
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

export async function reactToCheckInAction(input: {
  checkInId: string;
  kind: "FIRE" | "STRONG" | "THINKING" | "EYES";
}) {
  const user = await getCurrentUser();
  const checkIn = await prisma.checkIn.findUnique({
    where: { id: input.checkInId },
    select: { id: true, groupId: true, userId: true },
  });
  if (!checkIn) throw new Error("Check-in not found");
  await requireGroupMembership(user.id, checkIn.groupId);

  const existing = await prisma.checkInReaction.findFirst({
    where: { checkInId: input.checkInId, userId: user.id, kind: input.kind },
    select: { id: true },
  });

  if (existing) {
    await prisma.checkInReaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.checkInReaction.create({
      data: { checkInId: input.checkInId, userId: user.id, kind: input.kind },
    });
    // Check milestone: 50 reactions received
    const totalReceived = await prisma.checkInReaction.count({
      where: { checkIn: { userId: checkIn.userId } },
    });
    if (totalReceived >= 50) {
      await prisma.milestoneBadge.upsert({
        where: { userId_kind_groupId: { userId: checkIn.userId, kind: "REACTIONS_50", groupId: checkIn.groupId } },
        update: {},
        create: { userId: checkIn.userId, kind: "REACTIONS_50", groupId: checkIn.groupId },
      });
    }
  }

  await refreshAppSurfaces(checkIn.groupId);
}

export async function createGroupDocumentAction(input: {
  groupId: string;
  title: string;
  content: string;
  fileUrl?: string;
  fileName?: string;
}) {
  const user = await getCurrentUser();
  const membership = await requireGroupMembership(user.id, input.groupId);
  if (membership.role !== "admin") throw new Error("Only the group leader can post documents");

  const title = input.title.trim();
  const content = input.content.trim();
  if (!title || !content) throw new Error("Title and content are required");

  await prisma.groupDocument.create({
    data: {
      groupId: input.groupId,
      authorId: user.id,
      title,
      content,
      fileUrl: input.fileUrl?.trim() || null,
      fileName: input.fileName?.trim() || null,
    },
  });

  await refreshAppSurfaces(input.groupId);
}

export async function deleteGroupDocumentAction(documentId: string) {
  const user = await getCurrentUser();
  const doc = await prisma.groupDocument.findUnique({
    where: { id: documentId },
    select: { groupId: true, authorId: true },
  });
  if (!doc) throw new Error("Document not found");
  const membership = await requireGroupMembership(user.id, doc.groupId);
  if (membership.role !== "admin" && doc.authorId !== user.id) {
    throw new Error("Only the group leader can delete documents");
  }
  await prisma.groupDocument.delete({ where: { id: documentId } });
  await refreshAppSurfaces(doc.groupId);
}

export async function postConfessionAction(input: { groupId: string; content: string }) {
  const user = await getCurrentUser();
  await requireGroupMembership(user.id, input.groupId);

  const content = input.content.trim();
  if (!content) throw new Error("Confession cannot be empty");

  const weekStart = startOfDay();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

  await prisma.confessionPost.create({
    data: {
      groupId: input.groupId,
      userId: user.id,
      content,
      weekStart,
    },
  });

  await refreshAppSurfaces(input.groupId);
}

export async function upvoteConfessionAction(confessionId: string) {
  const user = await getCurrentUser();
  const confession = await prisma.confessionPost.findUnique({
    where: { id: confessionId },
    select: { groupId: true },
  });
  if (!confession) throw new Error("Confession not found");
  await requireGroupMembership(user.id, confession.groupId);

  const existing = await prisma.confessionUpvote.findUnique({
    where: { confessionId_userId: { confessionId, userId: user.id } },
    select: { id: true },
  });

  if (existing) {
    await prisma.confessionUpvote.delete({ where: { id: existing.id } });
  } else {
    await prisma.confessionUpvote.create({ data: { confessionId, userId: user.id } });
  }

  await refreshAppSurfaces(confession.groupId);
}

export async function issueRedemptionTaskAction(input: {
  groupId: string;
  targetUserId: string;
  title: string;
  details?: string;
  penaltyEventId?: string;
}) {
  const user = await getCurrentUser();
  const membership = await requireGroupMembership(user.id, input.groupId);
  if (membership.role !== "admin") throw new Error("Only the group leader can issue redemption tasks");

  await requireGroupMembership(input.targetUserId, input.groupId);

  await prisma.redemptionTask.create({
    data: {
      groupId: input.groupId,
      targetUserId: input.targetUserId,
      title: input.title.trim(),
      details: input.details?.trim() || null,
      penaltyEventId: input.penaltyEventId || null,
    },
  });

  await refreshAppSurfaces(input.groupId);
}

export async function submitRedemptionTaskAction(input: {
  redemptionTaskId: string;
  startFileUrl: string;
  endFileUrl: string;
  reflection: string;
}) {
  const user = await getCurrentUser();
  const task = await prisma.redemptionTask.findUnique({
    where: { id: input.redemptionTaskId },
    select: { id: true, groupId: true, targetUserId: true, status: true },
  });
  if (!task) throw new Error("Redemption task not found");
  if (task.targetUserId !== user.id) throw new Error("This task is not assigned to you");
  if (task.status !== "PENDING") throw new Error("This task has already been submitted");

  await prisma.redemptionTask.update({
    where: { id: input.redemptionTaskId },
    data: {
      status: "SUBMITTED",
      startFileUrl: input.startFileUrl,
      endFileUrl: input.endFileUrl,
      reflection: input.reflection.trim(),
    },
  });

  await refreshAppSurfaces(task.groupId);
}

export async function resolveRedemptionTaskAction(input: {
  redemptionTaskId: string;
  approve: boolean;
}) {
  const user = await getCurrentUser();
  const task = await prisma.redemptionTask.findUnique({
    where: { id: input.redemptionTaskId },
    select: { id: true, groupId: true, targetUserId: true, status: true, penaltyEventId: true },
  });
  if (!task) throw new Error("Redemption task not found");
  const membership = await requireGroupMembership(user.id, task.groupId);
  if (membership.role !== "admin") throw new Error("Only the group leader can resolve redemption tasks");
  if (task.status !== "SUBMITTED") throw new Error("Task has not been submitted yet");

  if (input.approve) {
    await prisma.$transaction(async (tx) => {
      await tx.redemptionTask.update({
        where: { id: task.id },
        data: { status: "APPROVED" },
      });
      // Wipe one penalty point from the user's penaltyCount
      await tx.user.update({
        where: { id: task.targetUserId },
        data: { penaltyCount: { decrement: 1 } },
      });
      // Also restore points in the group
      const group = await tx.group.findUnique({ where: { id: task.groupId }, select: { dailyPenalty: true } });
      if (group) {
        await tx.userGroup.update({
          where: { userId_groupId: { userId: task.targetUserId, groupId: task.groupId } },
          data: { points: { increment: group.dailyPenalty }, misses: { decrement: 1 } },
        });
      }
    });
  } else {
    await prisma.redemptionTask.update({
      where: { id: task.id },
      data: { status: "REJECTED" },
    });
  }

  await refreshAppSurfaces(task.groupId);
}

export async function resolveDisputeAction(input: {
  checkInId: string;
  outcome: "PENALIZED" | "DISMISSED";
}) {
  const user = await getCurrentUser();

  const checkIn = await prisma.checkIn.findUnique({
    where: { id: input.checkInId },
    include: {
      group: true,
      user: true,
      verifications: { where: { verdict: "FLAG" } },
    },
  });

  if (!checkIn) throw new Error("Check-in not found");

  const membership = await requireGroupMembership(user.id, checkIn.groupId);
  if (membership.role !== "admin") throw new Error("Only the group leader can resolve disputes");

  if (checkIn.status !== "FLAGGED") throw new Error("This check-in is not flagged");

  const flagVerifications = checkIn.verifications;
  if (!flagVerifications.length) throw new Error("No flag found on this check-in");

  // Mark all FLAG verifications as resolved
  await prisma.submissionVerification.updateMany({
    where: { checkInId: input.checkInId, verdict: "FLAG" },
    data: {
      disputeOutcome: input.outcome,
      resolvedAt: new Date(),
    },
  });

  if (input.outcome === "PENALIZED") {
    const isChallengeMode = await prisma.task.findFirst({
      where: { checkInId: input.checkInId, isChallengeMode: true },
      select: { id: true },
    });
    const penaltyPoints = isChallengeMode
      ? checkIn.group.dailyPenalty * 2
      : checkIn.group.dailyPenalty;

    const reason = `Dispute upheld — submission penalized by leader`;

    const existing = await prisma.penaltyEvent.findFirst({
      where: { checkInId: input.checkInId, reason },
    });

    if (!existing) {
      await prisma.$transaction(async (tx) => {
        await tx.penaltyEvent.create({
          data: {
            userId: checkIn.userId,
            groupId: checkIn.groupId,
            checkInId: checkIn.id,
            points: penaltyPoints,
            reason,
          },
        });
        await tx.user.update({
          where: { id: checkIn.userId },
          data: { penaltyCount: { increment: 1 } },
        });
        await tx.userGroup.update({
          where: { userId_groupId: { userId: checkIn.userId, groupId: checkIn.groupId } },
          data: {
            points: { decrement: penaltyPoints },
            misses: { increment: 1 },
            streak: 0,
          },
        });
        await tx.checkIn.update({
          where: { id: checkIn.id },
          data: { penaltyApplied: { increment: penaltyPoints } },
        });
      });
    }
  }

  await refreshAppSurfaces(checkIn.groupId);
}
