import Link from "next/link";
import { Plus } from "lucide-react";
import { AdminGroupCard } from "@/components/shared/admin-group-card";
import { DashboardInsights } from "@/components/shared/dashboard-insights";
import { JoinGroupDialog } from "@/components/shared/join-group-dialog";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/studypact";
import {
  addDays,
  calculateCompletionRate,
  calculateLevel,
  formatDayKey,
  generateAiProgressFeedback,
  getAchievementBadges,
  startOfDay,
} from "@/lib/studypact";

export default async function DashboardPage() {
  const user = await requireSessionUser("/dashboard");
  const today = startOfDay();
  const weekStart = addDays(today, -6);

  const [memberships, recentTasks, recentPenalties, recentCheckIns] = await Promise.all([
    prisma.userGroup.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        joinedAt: "desc",
      },
      include: {
        group: {
          include: {
            _count: {
              select: {
                users: true,
                startFiles: true,
                endFiles: true,
              },
            },
          },
        },
      },
    }),
    prisma.task.findMany({
      where: {
        userId: user.id,
        day: {
          gte: weekStart,
          lte: today,
        },
      },
      select: {
        day: true,
        status: true,
      },
    }),
    prisma.penaltyEvent.findMany({
      where: {
        userId: user.id,
      },
      include: {
        group: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
    prisma.checkIn.findMany({
      where: {
        userId: user.id,
      },
      include: {
        group: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 4,
    }),
  ]);

  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const dayKey = formatDayKey(day);
    const tasksForDay = recentTasks.filter((task) => formatDayKey(task.day) === dayKey);

    return {
      day: day.toLocaleDateString("en-IN", { weekday: "short" }),
      completed: tasksForDay.filter((task) => task.status === "COMPLETED").length,
      missed: tasksForDay.filter((task) => task.status === "MISSED").length,
    };
  });

  const aggregate = memberships.reduce(
    (summary, membership) => ({
      points: summary.points + membership.points,
      completions: summary.completions + membership.completions,
      misses: summary.misses + membership.misses,
      streak: Math.max(summary.streak, membership.streak),
      role: (summary.role === "admin" || membership.role === "admin" ? "admin" : "member") as "member" | "admin",
    }),
    {
      points: 0,
      completions: 0,
      misses: 0,
      streak: 0,
      role: "member" as "member" | "admin",
    },
  );
  const level = calculateLevel(aggregate.points, aggregate.completions);
  const badges = getAchievementBadges({
    streak: aggregate.streak,
    completions: aggregate.completions,
    points: aggregate.points,
    misses: aggregate.misses,
    role: aggregate.role,
  });
  const aiFeedback = generateAiProgressFeedback({
    completionRate: calculateCompletionRate(aggregate.completions, aggregate.misses),
    streak: aggregate.streak,
    misses: aggregate.misses,
    points: aggregate.points,
  });
  const alerts = [
    ...recentPenalties.map((penalty) => ({
      id: `penalty-${penalty.id}`,
      title: `Penalty in ${penalty.group.name}`,
      detail: `-${penalty.points} pts • ${penalty.reason}`,
    })),
    ...recentCheckIns
      .filter((checkIn) => checkIn.status === "FLAGGED" || checkIn.status === "REJECTED")
      .map((checkIn) => ({
        id: `checkin-${checkIn.id}`,
        title: `Proof needs attention in ${checkIn.group.name}`,
        detail: `Latest review status: ${checkIn.status.toLowerCase()}`,
      })),
  ].slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Study Groups</h1>
          <p className="text-zinc-400">Keep track of your commitments, invite links, and reputation across active pacts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <JoinGroupDialog />
          <Link href="/groups/create">
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              <Plus className="w-4 h-4" /> Create Group
            </Button>
          </Link>
        </div>
      </div>

      {null}

      <DashboardInsights
        trend={trend}
        badges={badges}
        aiFeedback={aiFeedback}
        level={level}
        alerts={alerts}
      />

      {memberships.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {memberships.map((membership) => (
            <AdminGroupCard
              key={membership.groupId}
              id={membership.group.id}
              badge={membership.role === "admin" ? "Group You Manage" : "Enrolled Group"}
              title={membership.group.name}
              description={`${membership.group.description || "Closed accountability circle"} • ${calculateCompletionRate(membership.completions, membership.misses)}% completion • ${membership.points} pts • ${membership.streak} streak • ${membership.reputationScore} rep`}
              memberCount={membership.group._count.users}
              fileCount={membership.group._count.startFiles + membership.group._count.endFiles}
              role={membership.role}
              focusType={membership.group.focusType}
              penaltyMode={membership.group.penaltyMode}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-10 text-center backdrop-blur-lg">
          <h2 className="text-2xl font-semibold text-white">No study groups yet</h2>
          <p className="mt-2 text-zinc-400">
            Create a new pact or open an invite link to join one. Your groups will appear here once you&apos;re in.
          </p>
        </div>
      )}
    </div>
  );
}
