import Link from "next/link";
import { Plus, CheckCircle2, ListTodo } from "lucide-react";
import { AdminGroupCard } from "@/components/shared/admin-group-card";
import { DashboardInsights } from "@/components/shared/dashboard-insights";
import { JoinGroupDialog } from "@/components/shared/join-group-dialog";
import { MidnightCountdown } from "@/components/shared/midnight-countdown";
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

  const [memberships, recentTasks, recentPenalties, recentCheckIns, todayCheckIns, todayTasks] = await Promise.all([
    prisma.userGroup.findMany({
      where: { userId: user.id },
      orderBy: { joinedAt: "desc" },
      include: {
        group: {
          include: {
            _count: { select: { users: true } },
          },
        },
      },
    }),
    prisma.task.findMany({
      where: { userId: user.id, day: { gte: weekStart, lte: today } },
      select: { day: true, status: true },
    }),
    prisma.penaltyEvent.findMany({
      where: { userId: user.id },
      include: { group: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.checkIn.findMany({
      where: { userId: user.id },
      include: { group: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.checkIn.findMany({
      where: { userId: user.id, day: today },
      select: { groupId: true, status: true },
    }),
    prisma.task.findMany({
      where: { userId: user.id, day: today },
      select: { groupId: true, status: true },
    }),
  ]);

  const todayCheckInByGroup = new Map(todayCheckIns.map((c) => [c.groupId, c.status]));

  // Today at a glance derived data
  const todayTaskTotal = todayTasks.length;
  const todayTaskCompleted = todayTasks.filter((t) => t.status === "COMPLETED").length;
  const todayTaskProgress = todayTaskTotal > 0 ? Math.round((todayTaskCompleted / todayTaskTotal) * 100) : 0;
  const todayTasksByGroup = new Map<string, { total: number; completed: number }>();
  for (const t of todayTasks) {
    const cur = todayTasksByGroup.get(t.groupId) ?? { total: 0, completed: 0 };
    todayTasksByGroup.set(t.groupId, {
      total: cur.total + 1,
      completed: cur.completed + (t.status === "COMPLETED" ? 1 : 0),
    });
  }

  const trend = Array.from({ length: 7 }, (_, index) => {
    const day = addDays(weekStart, index);
    const dayKey = formatDayKey(day);
    const tasksForDay = recentTasks.filter((task) => formatDayKey(task.day) === dayKey);
    return {
      day: day.toLocaleDateString("en-IN", { weekday: "short" }),
      completed: tasksForDay.filter((t) => t.status === "COMPLETED").length,
      missed: tasksForDay.filter((t) => t.status === "MISSED").length,
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
    { points: 0, completions: 0, misses: 0, streak: 0, role: "member" as "member" | "admin" },
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
    ...recentPenalties.map((p) => ({
      id: `penalty-${p.id}`,
      title: `Penalty in ${p.group.name}`,
      detail: `-${p.points} pts • ${p.reason}`,
    })),
    ...recentCheckIns
      .filter((c) => c.status === "FLAGGED" || c.status === "REJECTED")
      .map((c) => ({
        id: `checkin-${c.id}`,
        title: `Proof needs attention in ${c.group.name}`,
        detail: `Latest review status: ${c.status.toLowerCase()}`,
      })),
  ].slice(0, 6);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Study Groups</h1>
          <p className="text-zinc-400">Track your commitments and submit today&apos;s proof before midnight.</p>
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

      {/* Today at a Glance */}
      {memberships.length > 0 && (
        <div className="rounded-2xl border border-zinc-800/70 bg-black/20 p-5 backdrop-blur-lg space-y-5">
          <h2 className="text-base font-semibold text-white">Today at a Glance</h2>

          {/* 3 stat tiles */}
          <div className="grid grid-cols-3 gap-3">
            {/* Tasks */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <ListTodo className="w-4 h-4 text-primary shrink-0" />
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Tasks today</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {todayTaskCompleted}<span className="text-sm text-zinc-500 font-normal"> / {todayTaskTotal}</span>
              </p>
              <div className="h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${todayTaskProgress}%` }} />
              </div>
            </div>

            {/* Check-ins */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Check-ins</p>
              </div>
              <p className="text-2xl font-bold text-white">
                {todayCheckIns.length}<span className="text-sm text-zinc-500 font-normal"> / {memberships.length}</span>
              </p>
              <p className="text-xs text-zinc-500">groups submitted</p>
            </div>

            {/* Time left */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 space-y-2">
              <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Time left</p>
              <MidnightCountdown submitted={false} />
            </div>
          </div>

          {/* Per-group rows */}
          <div className="space-y-2">
            {memberships.map((membership) => {
              const todayStatus = todayCheckInByGroup.get(membership.groupId) ?? null;
              const submitted = todayStatus === "APPROVED" || todayStatus === "PENDING";
              const groupTasks = todayTasksByGroup.get(membership.groupId);
              return (
                <div key={membership.groupId} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-950/40 px-4 py-3 gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{membership.group.name}</p>
                    {groupTasks && (
                      <span className="text-xs text-zinc-500 shrink-0">
                        {groupTasks.completed}/{groupTasks.total} tasks
                      </span>
                    )}
                  </div>
                  {submitted ? (
                    <span className="shrink-0 flex items-center gap-1 text-xs font-medium text-emerald-400 border border-emerald-500/30 bg-emerald-500/10 rounded-lg px-2.5 py-1">
                      <CheckCircle2 className="w-3 h-3" /> Submitted
                    </span>
                  ) : (
                    <Link
                      href={`/group/${membership.groupId}/feed`}
                      className="shrink-0 text-xs font-medium text-amber-300 border border-amber-500/30 bg-amber-500/10 rounded-lg px-2.5 py-1 hover:bg-amber-500/20 transition-colors"
                    >
                      Pending — Submit now →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <DashboardInsights
        trend={trend}
        badges={badges}
        aiFeedback={aiFeedback}
        level={level}
        alerts={alerts}
      />

      {memberships.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {memberships.map((membership) => {
            const todayStatus = todayCheckInByGroup.get(membership.groupId) ?? null;
            const submitted = todayStatus === "APPROVED" || todayStatus === "PENDING";
            return (
              <AdminGroupCard
                key={membership.groupId}
                id={membership.group.id}
                badge={membership.role === "admin" ? "Group You Manage" : "Enrolled Group"}
                title={membership.group.name}
                description={membership.group.description}
                memberCount={membership.group._count.users}
                role={membership.role}
                focusType={membership.group.focusType}
                points={membership.points}
                streak={membership.streak}
                completionRate={calculateCompletionRate(membership.completions, membership.misses)}
                submittedToday={submitted}
                todayStatus={todayStatus}
              />
            );
          })}
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
