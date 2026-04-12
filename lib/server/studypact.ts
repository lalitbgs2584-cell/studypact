import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { UTApi } from "uploadthing/server";
import auth from "@/lib/auth/auth";
import { prisma } from "@/lib/db";
import { reportServerError } from "@/lib/monitoring";
import {
  sendFlaggedSubmissionEmail,
  sendPreDeadlineNudgeEmail,
} from "@/lib/notifications/email";
import {
  addDays,
  calculateReputationScore,
  calculateRequiredReviewVotes,
  formatDayKey,
  startOfDay,
  startOfYesterday,
} from "@/lib/studypact";

const utapi = new UTApi();

export async function getCurrentSessionUser() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return session?.user ?? null;
}

export function buildLoginRedirect(pathname: string) {
  return `/login?redirectTo=${encodeURIComponent(pathname)}`;
}

export function buildAppUrl(pathname: string) {
  const baseUrl = process.env.BETTER_AUTH_BASE_URL || "http://localhost:3000";
  return new URL(pathname, baseUrl).toString();
}

export async function requireSessionUser(pathname = "/dashboard") {
  const user = await getCurrentSessionUser();

  if (!user) {
    redirect(buildLoginRedirect(pathname));
  }

  if (user.isBlocked) {
    redirect("/blocked");
  }

  return user;
}

export async function getGroupMembership(userId: string, groupId: string) {
  return prisma.userGroup.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    include: {
      group: true,
      user: true,
    },
  });
}

export async function requireGroupMembership(userId: string, groupId: string) {
  const membership = await getGroupMembership(userId, groupId);

  if (!membership) {
    throw new Error("You are not part of this group");
  }

  return membership;
}

export async function ensureRecurringTasksForUser(userId: string, targetDay = startOfDay()) {
  const memberships = await prisma.userGroup.findMany({
    where: { userId },
    select: { groupId: true },
  });

  if (!memberships.length) {
    return 0;
  }

  const groupIds = memberships.map((membership) => membership.groupId);
  const templates = await prisma.taskTemplate.findMany({
    where: {
      isActive: true,
      groupId: {
        in: groupIds,
      },
      OR: [
        {
          scope: "GROUP",
        },
        {
          scope: "PERSONAL",
          userId,
        },
      ],
    },
  });

  if (!templates.length) {
    return 0;
  }

  const templateIds = templates.map((template) => template.id);
  const existingTasks = await prisma.task.findMany({
    where: {
      userId,
      day: targetDay,
      templateId: {
        in: templateIds,
      },
    },
    select: {
      templateId: true,
    },
  });

  const existingTemplateIds = new Set(existingTasks.map((task) => task.templateId).filter(Boolean));
  const missingTasks = templates
    .filter((template) => !existingTemplateIds.has(template.id))
    .map((template) => ({
      title: template.title,
      details: template.details,
      category: template.category,
      targetMinutes: template.targetMinutes,
      day: targetDay,
      groupId: template.groupId,
      userId,
      templateId: template.id,
    }));

  if (!missingTasks.length) {
    return 0;
  }

  await prisma.task.createMany({
    data: missingTasks,
  });

  return missingTasks.length;
}

export async function materializeAllGroupsForToday(targetDay = startOfDay()) {
  const groups = await prisma.group.findMany({ select: { id: true } });
  let totalCreated = 0;
  for (const group of groups) {
    totalCreated += await materializeGroupRecurringTasks(group.id, targetDay);
  }
  return { groups: groups.length, tasksCreated: totalCreated };
}

export async function materializeGroupRecurringTasks(groupId: string, targetDay = startOfDay()) {
  const [memberships, templates] = await Promise.all([
    prisma.userGroup.findMany({
      where: { groupId },
      select: { userId: true },
    }),
    prisma.taskTemplate.findMany({
      where: {
        groupId,
        isActive: true,
      },
    }),
  ]);

  if (!memberships.length || !templates.length) {
    return 0;
  }

  const userIds = memberships.map((membership) => membership.userId);
  const templateIds = templates.map((template) => template.id);
  const existingTasks = await prisma.task.findMany({
    where: {
      groupId,
      day: targetDay,
      templateId: {
        in: templateIds,
      },
      userId: {
        in: userIds,
      },
    },
    select: {
      userId: true,
      templateId: true,
    },
  });

  const existingPairs = new Set(
    existingTasks
      .filter((task) => task.templateId)
      .map((task) => `${task.templateId}:${task.userId}`),
  );

  const tasksToCreate = templates.flatMap((template) => {
    const scopedUserIds =
      template.scope === "PERSONAL"
        ? template.userId
          ? [template.userId]
          : []
        : userIds;

    return scopedUserIds
      .filter((userIdValue) => !existingPairs.has(`${template.id}:${userIdValue}`))
      .map((userIdValue) => ({
        title: template.title,
        details: template.details,
        category: template.category,
        targetMinutes: template.targetMinutes,
        day: targetDay,
        groupId,
        userId: userIdValue,
        templateId: template.id,
      }));
  });

  if (!tasksToCreate.length) {
    return 0;
  }

  await prisma.task.createMany({
    data: tasksToCreate,
  });

  return tasksToCreate.length;
}

export type InviteLinkState = {
  status: "missing" | "expired" | "full" | "joinable" | "already-member";
  group:
    | {
        id: string;
        name: string;
        description: string | null;
        inviteCode: string;
        inviteExpiresAt: Date;
        maxMembers: number;
        memberCount: number;
      }
    | null;
};

export async function getInviteLinkState(token: string, userId?: string | null): Promise<InviteLinkState> {
  const normalizedToken = token.trim().toUpperCase();
  if (!normalizedToken) {
    return { status: "missing", group: null };
  }

  const group = await prisma.group.findUnique({
    where: {
      inviteCode: normalizedToken,
    },
    include: {
      _count: {
        select: {
          users: true,
        },
      },
    },
  });

  if (!group) {
    return { status: "missing", group: null };
  }

  const inviteGroup = {
    id: group.id,
    name: group.name,
    description: group.description,
    inviteCode: group.inviteCode,
    inviteExpiresAt: group.inviteExpiresAt,
    maxMembers: group.maxMembers,
    memberCount: group._count.users,
  };

  if (group.inviteExpiresAt <= new Date()) {
    return { status: "expired", group: inviteGroup };
  }

  if (userId) {
    const membership = await prisma.userGroup.findUnique({
      where: {
        userId_groupId: {
          userId,
          groupId: group.id,
        },
      },
      select: {
        userId: true,
      },
    });

    if (membership) {
      return { status: "already-member", group: inviteGroup };
    }
  }

  if (group._count.users >= group.maxMembers) {
    return { status: "full", group: inviteGroup };
  }

  return { status: "joinable", group: inviteGroup };
}

export async function refreshMembershipReputation(userId: string, groupId: string) {
  const membership = await prisma.userGroup.findUnique({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
  });

  if (!membership) {
    return;
  }

  const reputationScore = calculateReputationScore({
    points: membership.points,
    streak: membership.streak,
    completions: membership.completions,
    misses: membership.misses,
    inactivityStrikes: membership.inactivityStrikes,
  });

  if (membership.reputationScore === reputationScore) {
    return;
  }

  await prisma.userGroup.update({
    where: {
      userId_groupId: {
        userId,
        groupId,
      },
    },
    data: {
      reputationScore,
    },
  });
}

async function createNotificationLog(input: {
  kind: "PRE_DEADLINE_NUDGE" | "FLAGGED_SUBMISSION";
  dedupeKey: string;
  userId: string;
  groupId?: string;
  checkInId?: string;
  taskDay?: Date;
}) {
  await prisma.notificationLog.create({
    data: {
      kind: input.kind,
      dedupeKey: input.dedupeKey,
      userId: input.userId,
      groupId: input.groupId,
      checkInId: input.checkInId,
      taskDay: input.taskDay,
    },
  });
}

async function hasNotificationLog(dedupeKey: string) {
  const existing = await prisma.notificationLog.findUnique({
    where: {
      dedupeKey,
    },
    select: {
      id: true,
    },
  });

  return Boolean(existing);
}

export async function sendFlaggedSubmissionAlert(checkInId: string) {
  const dedupeKey = `flagged:${checkInId}`;
  if (await hasNotificationLog(dedupeKey)) {
    return false;
  }

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    include: {
      user: true,
      group: true,
    },
  });

  if (!checkIn) {
    return false;
  }

  await sendFlaggedSubmissionEmail({
    email: checkIn.user.email,
    name: checkIn.user.name,
    groupName: checkIn.group.name,
    groupUrl: buildAppUrl(`/group/${checkIn.groupId}/feed`),
  });

  await createNotificationLog({
    kind: "FLAGGED_SUBMISSION",
    dedupeKey,
    userId: checkIn.userId,
    groupId: checkIn.groupId,
    checkInId: checkIn.id,
    taskDay: checkIn.day,
  });

  return true;
}

export async function deleteUploadThingFile(storageKey?: string | null) {
  if (!storageKey) {
    return;
  }

  try {
    await utapi.deleteFiles(storageKey);
  } catch (error) {
    console.error("Failed to delete UploadThing file", { storageKey, error });
  }
}

export async function cleanupAbandonedDraftProofs(cutoffHours = 6) {
  const cutoff = new Date(Date.now() - cutoffHours * 60 * 60 * 1000);
  const [startFiles, endFiles] = await Promise.all([
    prisma.startFile.findMany({
      where: {
        checkInId: null,
        uploadedAt: {
          lt: cutoff,
        },
      },
    }),
    prisma.endFile.findMany({
      where: {
        checkInId: null,
        uploadedAt: {
          lt: cutoff,
        },
      },
    }),
  ]);

  for (const file of startFiles) {
    await deleteUploadThingFile(file.storageKey);
    await prisma.startFile.delete({
      where: {
        id: file.id,
      },
    });
  }

  for (const file of endFiles) {
    await deleteUploadThingFile(file.storageKey);
    await prisma.endFile.delete({
      where: {
        id: file.id,
      },
    });
  }

  return {
    cleanedStartDrafts: startFiles.length,
    cleanedEndDrafts: endFiles.length,
  };
}

export async function sendPreDeadlineNudges(options?: {
  groupId?: string;
  targetDay?: Date;
}) {
  const targetDay = startOfDay(options?.targetDay ?? new Date());
  const targetKey = formatDayKey(targetDay);
  const groups = options?.groupId
    ? [{ id: options.groupId }]
    : await prisma.group.findMany({
        select: {
          id: true,
        },
      });

  const summary = {
    targetKey,
    checkedGroups: 0,
    nudgedUsers: 0,
    skippedUsers: 0,
  };

  for (const group of groups) {
    summary.checkedGroups += 1;
    await materializeGroupRecurringTasks(group.id, targetDay);

    const [memberships, tasks, checkIns] = await Promise.all([
      prisma.userGroup.findMany({
        where: {
          groupId: group.id,
        },
        include: {
          user: true,
          group: true,
        },
      }),
      prisma.task.findMany({
        where: {
          groupId: group.id,
          day: targetDay,
        },
        select: {
          userId: true,
        },
      }),
      prisma.checkIn.findMany({
        where: {
          groupId: group.id,
          day: targetDay,
        },
        include: {
          endFiles: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    const taskUserIds = new Set(tasks.map((task) => task.userId));
    const checkInsByUser = new Map(checkIns.map((checkIn) => [checkIn.userId, checkIn]));

    for (const membership of memberships) {
      if (!taskUserIds.has(membership.userId)) {
        continue;
      }

      const checkIn = checkInsByUser.get(membership.userId);
      if (checkIn?.endFiles.length) {
        continue;
      }

      const dedupeKey = `nudge:${group.id}:${membership.userId}:${targetKey}`;
      if (await hasNotificationLog(dedupeKey)) {
        summary.skippedUsers += 1;
        continue;
      }

      try {
        await sendPreDeadlineNudgeEmail({
          email: membership.user.email,
          name: membership.user.name,
          groupName: membership.group.name,
          dashboardUrl: buildAppUrl(`/group/${group.id}/checkin`),
        });

        await createNotificationLog({
          kind: "PRE_DEADLINE_NUDGE",
          dedupeKey,
          userId: membership.userId,
          groupId: group.id,
          taskDay: targetDay,
        });

        summary.nudgedUsers += 1;
      } catch (error) {
        await reportServerError("sendPreDeadlineNudges", error, {
          groupId: group.id,
          userId: membership.userId,
          targetKey,
        });
        summary.skippedUsers += 1;
      }
    }
  }

  return summary;
}

export async function syncMissedCheckInPenalties(options?: {
  groupId?: string;
  targetDay?: Date;
}) {
  const targetDay = startOfDay(options?.targetDay ?? startOfYesterday());
  const targetKey = formatDayKey(targetDay);
  const millisecondsPerDay = 1000 * 60 * 60 * 24;
  const groups = options?.groupId
    ? [{ id: options.groupId }]
    : await prisma.group.findMany({
        select: {
          id: true,
        },
      });

  const summary = {
    targetKey,
    checkedGroups: 0,
    penalizedUsers: 0,
    skippedUsers: 0,
    decayedUsers: 0,
    reengagedUsers: 0,
  };

  for (const group of groups) {
    summary.checkedGroups += 1;
    await materializeGroupRecurringTasks(group.id, targetDay);

    const [memberships, tasks, checkIns] = await Promise.all([
      prisma.userGroup.findMany({
        where: {
          groupId: group.id,
        },
        include: {
          group: true,
        },
      }),
      prisma.task.findMany({
        where: {
          groupId: group.id,
          day: targetDay,
        },
        select: {
          id: true,
          userId: true,
          status: true,
          isChallengeMode: true,
        },
      }),
      prisma.checkIn.findMany({
        where: {
          groupId: group.id,
          day: targetDay,
        },
        include: {
          endFiles: {
            select: {
              id: true,
            },
          },
        },
      }),
    ]);

    if (!tasks.length) {
      continue;
    }

    const taskIdsByUser = new Map<string, string[]>();
    for (const task of tasks) {
      const current = taskIdsByUser.get(task.userId) ?? [];
      current.push(task.id);
      taskIdsByUser.set(task.userId, current);
    }

    const checkInsByUser = new Map(checkIns.map((checkIn) => [checkIn.userId, checkIn]));

    for (const membership of memberships) {
      const taskIds = taskIdsByUser.get(membership.userId);
      if (!taskIds?.length) {
        const lastActiveAt = membership.lastCheckInAt ?? membership.joinedAt;
        const inactiveDays = Math.max(
          Math.floor((targetDay.getTime() - startOfDay(lastActiveAt).getTime()) / millisecondsPerDay) - 1,
          0,
        );

        if (membership.inactivityStrikes !== inactiveDays) {
          await prisma.userGroup.update({
            where: {
              userId_groupId: {
                userId: membership.userId,
                groupId: group.id,
              },
            },
            data: {
              inactivityStrikes: inactiveDays,
            },
          });

          await refreshMembershipReputation(membership.userId, group.id);
          if (inactiveDays > membership.inactivityStrikes) {
            summary.decayedUsers += 1;
          } else {
            summary.reengagedUsers += 1;
          }
        }

        continue;
      }

      const checkIn = checkInsByUser.get(membership.userId);
      const hasEndProof = Boolean(checkIn?.endFiles.length);

      if (checkIn && hasEndProof) {
        if (membership.inactivityStrikes !== 0) {
          await prisma.userGroup.update({
            where: {
              userId_groupId: {
                userId: membership.userId,
                groupId: group.id,
              },
            },
            data: {
              inactivityStrikes: 0,
            },
          });

          await refreshMembershipReputation(membership.userId, group.id);
          summary.reengagedUsers += 1;
        }
        continue;
      }

      const reason = checkIn
        ? `Missing end proof for ${targetKey}`
        : `Missed daily check-in for ${targetKey}`;

      const hasChallengeTask = taskIds.some(
        (id) => tasks.find((t) => t.id === id)?.isChallengeMode,
      );
      const penaltyPoints = hasChallengeTask
        ? membership.group.dailyPenalty * 2
        : membership.group.dailyPenalty;

      const existingPenalty = await prisma.penaltyEvent.findFirst({
        where: { groupId: group.id, userId: membership.userId, reason },
      });

      if (existingPenalty) {
        summary.skippedUsers += 1;
        continue;
      }

      await prisma.$transaction(async (tx) => {
        await tx.penaltyEvent.create({
          data: {
            userId: membership.userId,
            groupId: group.id,
            checkInId: checkIn?.id,
            points: penaltyPoints,
            reason,
          },
        });

        await tx.user.update({
          where: { id: membership.userId },
          data: { penaltyCount: { increment: 1 } },
        });

        await tx.userGroup.update({
          where: { userId_groupId: { userId: membership.userId, groupId: group.id } },
          data: {
            points: { decrement: penaltyPoints },
            misses: { increment: 1 },
            streak: 0,
            inactivityStrikes: 0,
          },
        });

        await tx.task.updateMany({
          where: { id: { in: taskIds }, status: "PENDING" },
          data: { status: "MISSED" },
        });

        if (checkIn) {
          await tx.checkIn.update({
            where: { id: checkIn.id },
            data: {
              status: "FLAGGED",
              verifiedAt: new Date(),
              penaltyApplied: penaltyPoints,
              pointsAwarded: 0,
            },
          });
        }
      });
      await refreshMembershipReputation(membership.userId, group.id);
      summary.penalizedUsers += 1;
    }
  }

  return summary;
}

async function applyApprovedCheckIn(checkInId: string) {
  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    include: {
      tasks: true,
      group: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  if (checkIn.status !== "PENDING" && checkIn.status !== "FLAGGED") {
    return checkIn.status;
  }

  const membership = await prisma.userGroup.findUnique({
    where: {
      userId_groupId: {
        userId: checkIn.userId,
        groupId: checkIn.groupId,
      },
    },
  });

  if (!membership) {
    throw new Error("Group membership missing");
  }

  const completedTasks = checkIn.tasks.filter((task) => task.status === "COMPLETED").length;
  const isChallengeMode = checkIn.tasks.some((task) => task.isChallengeMode);
  const basePoints = Math.max(10, completedTasks * 5);
  const awardedPoints = isChallengeMode ? basePoints * 2 : basePoints;
  const targetKey = formatDayKey(checkIn.day);
  const previousKey = membership.lastCheckInAt ? formatDayKey(membership.lastCheckInAt) : null;
  const previousDayKey = formatDayKey(addDays(checkIn.day, -1));

  const nextStreak =
    previousKey === targetKey
      ? membership.streak
      : previousKey === previousDayKey
        ? membership.streak + 1
        : 1;

  await prisma.$transaction([
    prisma.checkIn.update({
      where: {
        id: checkIn.id,
      },
      data: {
        status: "APPROVED",
        verifiedAt: new Date(),
        pointsAwarded: awardedPoints,
        penaltyApplied: 0,
      },
    }),
    prisma.userGroup.update({
      where: {
        userId_groupId: {
          userId: checkIn.userId,
          groupId: checkIn.groupId,
        },
      },
      data: {
        points: {
          increment: awardedPoints,
        },
        completions: {
          increment: 1,
        },
        streak: nextStreak,
        inactivityStrikes: 0,
        lastCheckInAt: checkIn.day,
      },
    }),
  ]);

  await refreshMembershipReputation(checkIn.userId, checkIn.groupId);
  await updateBestStreakAfterCheckIn(checkIn.userId, checkIn.groupId);
  await awardMilestoneBadges(checkIn.userId, checkIn.groupId);
  return "APPROVED" as const;
}

async function applyFlaggedCheckIn(checkInId: string) {
  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    include: {
      group: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  if (checkIn.status === "FLAGGED") {
    return checkIn.status;
  }

  if (checkIn.status !== "PENDING") {
    return checkIn.status;
  }

  await prisma.$transaction(async (tx) => {
    await tx.checkIn.update({
      where: {
        id: checkIn.id,
      },
      data: {
        status: "FLAGGED",
        verifiedAt: new Date(),
        penaltyApplied: 0,
        pointsAwarded: 0,
      },
    });
  });
  return "FLAGGED" as const;
}

async function applyRejectedCheckIn(checkInId: string) {
  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    include: {
      group: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  if (checkIn.status !== "PENDING" && checkIn.status !== "FLAGGED") {
    return checkIn.status;
  }

  const reason = "Check-in rejected by peer majority vote";
  const existingPenalty = await prisma.penaltyEvent.findFirst({
    where: {
      groupId: checkIn.groupId,
      userId: checkIn.userId,
      checkInId: checkIn.id,
      reason,
    },
  });

  await prisma.$transaction(async (tx) => {
    await tx.checkIn.update({
      where: {
        id: checkIn.id,
      },
      data: {
        status: "REJECTED",
        verifiedAt: new Date(),
        penaltyApplied: checkIn.group.dailyPenalty,
        pointsAwarded: 0,
      },
    });

    if (!existingPenalty) {
      await tx.penaltyEvent.create({
        data: {
          userId: checkIn.userId,
          groupId: checkIn.groupId,
          checkInId: checkIn.id,
          points: checkIn.group.dailyPenalty,
          reason,
        },
      });

      await tx.userGroup.update({
        where: {
          userId_groupId: {
            userId: checkIn.userId,
            groupId: checkIn.groupId,
          },
        },
        data: {
          points: {
            decrement: checkIn.group.dailyPenalty,
          },
          misses: {
            increment: 1,
          },
          streak: 0,
          inactivityStrikes: 0,
        },
      });

      await tx.user.update({
        where: {
          id: checkIn.userId,
        },
        data: {
          penaltyCount: {
            increment: 1,
          },
        },
      });
    }
  });

  await refreshMembershipReputation(checkIn.userId, checkIn.groupId);
  return "REJECTED" as const;
}

export async function resolveCheckInAfterVerification(checkInId: string) {
  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    include: {
      verifications: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  const memberships = await prisma.userGroup.findMany({
    where: {
      groupId: checkIn.groupId,
    },
    select: {
      userId: true,
      role: true,
    },
  });

  const roleByUserId = new Map(memberships.map((membership) => [membership.userId, membership.role ?? "member"]));
  const adminVote = checkIn.verifications.find((verification) => roleByUserId.get(verification.reviewerId) === "admin");
  const approvalCount = checkIn.verifications.filter((verification) => verification.verdict === "APPROVE").length;
  const flagCount = checkIn.verifications.filter((verification) => verification.verdict === "FLAG").length;
  const requiredVotes = calculateRequiredReviewVotes(memberships.length);
  const totalVotes = checkIn.verifications.length;
  const rejectionMajority = Math.floor(totalVotes / 2) + 1;

  if (adminVote) {
    const status =
      adminVote.verdict === "APPROVE"
        ? await applyApprovedCheckIn(checkIn.id)
        : await applyFlaggedCheckIn(checkIn.id);

    return {
      resolved: true,
      status,
      approvalCount,
      flagCount,
      requiredVotes,
      resolution: "admin-override" as const,
    };
  }

  if (approvalCount >= requiredVotes && approvalCount > flagCount) {
    const status = await applyApprovedCheckIn(checkIn.id);
    return {
      resolved: true,
      status,
      approvalCount,
      flagCount,
      requiredVotes,
      resolution: "majority-vote" as const,
    };
  }

  if (flagCount >= rejectionMajority && flagCount > approvalCount) {
    const status = await applyFlaggedCheckIn(checkIn.id);
    return {
      resolved: true,
      status,
      approvalCount,
      flagCount,
      requiredVotes,
      resolution: "leader-review" as const,
    };
  }

  return {
    resolved: false,
    status: checkIn.status,
    approvalCount,
    flagCount,
    requiredVotes,
    resolution: null,
  };
}

export async function platformResolveCheckIn(checkInId: string, verdict: "APPROVE" | "FLAG") {
  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    select: {
      status: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  if (checkIn.status !== "PENDING") {
    return checkIn.status;
  }

  if (verdict === "APPROVE") {
    return applyApprovedCheckIn(checkInId);
  }

  const status = await applyFlaggedCheckIn(checkInId);
  await sendFlaggedSubmissionAlert(checkInId);
  return status;
}

export async function leaderResolveCheckIn(checkInId: string, verdict: "APPROVE" | "REJECT") {
  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    select: {
      status: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in not found");
  }

  if (checkIn.status !== "FLAGGED") {
    return checkIn.status;
  }

  if (verdict === "APPROVE") {
    return applyApprovedCheckIn(checkInId);
  }

  return applyRejectedCheckIn(checkInId);
}

export async function generateWeeklyRecapAndHallOfFame(options?: { groupId?: string }) {
  const today = startOfDay();
  const weekStart = addDays(today, -6);

  const groups = options?.groupId
    ? [{ id: options.groupId }]
    : await prisma.group.findMany({ select: { id: true } });

  for (const group of groups) {
    const [memberships, weeklyCheckIns, weeklyPenalties] = await Promise.all([
      prisma.userGroup.findMany({
        where: { groupId: group.id },
        include: { user: { select: { id: true, name: true } } },
      }),
      prisma.checkIn.findMany({
        where: { groupId: group.id, day: { gte: weekStart, lte: today }, status: "APPROVED" },
        select: { userId: true },
      }),
      prisma.penaltyEvent.findMany({
        where: { groupId: group.id, createdAt: { gte: weekStart } },
        select: { userId: true, points: true },
      }),
    ]);

    if (!memberships.length) continue;

    const completionsByUser = new Map<string, number>();
    for (const c of weeklyCheckIns) {
      completionsByUser.set(c.userId, (completionsByUser.get(c.userId) ?? 0) + 1);
    }

    const penaltiesByUser = new Map<string, number>();
    for (const p of weeklyPenalties) {
      penaltiesByUser.set(p.userId, (penaltiesByUser.get(p.userId) ?? 0) + p.points);
    }

    const mvp = memberships.reduce((best, m) =>
      (completionsByUser.get(m.userId) ?? 0) > (completionsByUser.get(best.userId) ?? 0) ? m : best,
    );
    const penaltyLeader = memberships.reduce((worst, m) =>
      (penaltiesByUser.get(m.userId) ?? 0) > (penaltiesByUser.get(worst.userId) ?? 0) ? m : worst,
    );
    const longestStreakMember = memberships.reduce((best, m) => m.streak > best.streak ? m : best);

    const memberStats = memberships.map((m) => ({
      userId: m.userId,
      name: m.user.name,
      completions: completionsByUser.get(m.userId) ?? 0,
      penalties: penaltiesByUser.get(m.userId) ?? 0,
    }));

    await prisma.weeklyRecap.upsert({
      where: { groupId_weekStart: { groupId: group.id, weekStart } },
      update: {
        totalCompleted: weeklyCheckIns.length,
        mvpUserId: mvp.userId,
        mvpName: mvp.user.name,
        penaltyLeaderUserId: penaltyLeader.userId,
        penaltyLeaderName: penaltyLeader.user.name,
        longestStreak: longestStreakMember.streak,
        longestStreakName: longestStreakMember.user.name,
        memberStats,
      },
      create: {
        groupId: group.id,
        weekStart,
        totalCompleted: weeklyCheckIns.length,
        mvpUserId: mvp.userId,
        mvpName: mvp.user.name,
        penaltyLeaderUserId: penaltyLeader.userId,
        penaltyLeaderName: penaltyLeader.user.name,
        longestStreak: longestStreakMember.streak,
        longestStreakName: longestStreakMember.user.name,
        memberStats,
      },
    });

    // Hall of fame: top performer vs most penalties
    const topMember = memberships.reduce((best, m) =>
      (completionsByUser.get(m.userId) ?? 0) > (completionsByUser.get(best.userId) ?? 0) ? m : best,
    );
    const bottomMember = memberships.reduce((worst, m) =>
      (penaltiesByUser.get(m.userId) ?? 0) > (penaltiesByUser.get(worst.userId) ?? 0) ? m : worst,
    );

    await prisma.hallOfFame.upsert({
      where: { groupId_weekStart: { groupId: group.id, weekStart } },
      update: {
        topUserId: topMember.userId,
        topName: topMember.user.name,
        topStat: `${completionsByUser.get(topMember.userId) ?? 0} completions this week`,
        bottomUserId: bottomMember.userId,
        bottomName: bottomMember.user.name,
        bottomStat: `${penaltiesByUser.get(bottomMember.userId) ?? 0} penalty pts this week`,
      },
      create: {
        groupId: group.id,
        weekStart,
        topUserId: topMember.userId,
        topName: topMember.user.name,
        topStat: `${completionsByUser.get(topMember.userId) ?? 0} completions this week`,
        bottomUserId: bottomMember.userId,
        bottomName: bottomMember.user.name,
        bottomStat: `${penaltiesByUser.get(bottomMember.userId) ?? 0} penalty pts this week`,
      },
    });
  }
}

export async function updateBestStreakAfterCheckIn(userId: string, groupId: string) {
  const membership = await prisma.userGroup.findUnique({
    where: { userId_groupId: { userId, groupId } },
    select: { streak: true, bestStreak: true },
  });
  if (!membership) return;
  if (membership.streak > membership.bestStreak) {
    await prisma.userGroup.update({
      where: { userId_groupId: { userId, groupId } },
      data: { bestStreak: membership.streak },
    });
  }
}

export async function awardMilestoneBadges(userId: string, groupId: string) {
  const [membership, checkIns, penalties] = await Promise.all([
    prisma.userGroup.findUnique({
      where: { userId_groupId: { userId, groupId } },
      select: { completions: true, streak: true, earlyBirdCount: true },
    }),
    prisma.checkIn.count({ where: { userId, groupId, status: "APPROVED" } }),
    prisma.penaltyEvent.count({ where: { userId, groupId } }),
  ]);

  if (!membership) return;

  const toAward: { kind: "FIRST_COMPLETION" | "STREAK_7" | "ZERO_PENALTIES_MONTH" | "EARLY_BIRD_10" | "REACTIONS_50" }[] = [];

  if (checkIns >= 1) toAward.push({ kind: "FIRST_COMPLETION" });
  if (membership.streak >= 7) toAward.push({ kind: "STREAK_7" });
  if (penalties === 0 && checkIns >= 20) toAward.push({ kind: "ZERO_PENALTIES_MONTH" });
  if (membership.earlyBirdCount >= 10) toAward.push({ kind: "EARLY_BIRD_10" });

  for (const badge of toAward) {
    await prisma.milestoneBadge.upsert({
      where: { userId_kind_groupId: { userId, kind: badge.kind, groupId } },
      update: {},
      create: { userId, kind: badge.kind, groupId },
    });
  }
}
