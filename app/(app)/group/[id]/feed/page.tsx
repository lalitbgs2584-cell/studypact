import { CheckCircle2, Clock3, Trophy, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { CheckinCard } from "@/components/shared/checkin-card";
import { CheckinForm } from "@/components/shared/checkin-form";
import { GroupChatPanel } from "@/components/shared/group-chat-panel";
import { GroupNav } from "@/components/shared/group-nav";
import { MidnightCountdown } from "@/components/shared/midnight-countdown";
import { MobileGroupNav } from "@/components/shared/mobile-group-nav";
import { prisma } from "@/lib/db";
import {
  addDays,
  formatDayKey,
  getGroupFocusLabel,
  getPenaltyModeLabel,
  getTaskPostingModeLabel,
  startOfDay,
} from "@/lib/studypact";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";

type FeedPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ board?: string }>;
};

export default async function GroupFeedPage({ params, searchParams }: FeedPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const board = resolvedSearchParams?.board === "early" ? "early" : "points";
  const user = await requireSessionUser(`/group/${id}/feed`);

  if (!(await getGroupMembership(user.id, id))) {
    notFound();
  }

  const today = startOfDay();
  const weekStart = addDays(today, -6);

  const [group, todayCheckIns, weeklyCheckIns, hallOfFame, earlyBirdTask, userTasks] = await Promise.all([
    prisma.group.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        focusType: true,
        penaltyMode: true,
        taskPostingMode: true,
        dailyPenalty: true,
        users: {
          select: {
            userId: true,
            joinedAt: true,
            role: true,
            points: true,
            streak: true,
            bestStreak: true,
            completions: true,
            misses: true,
            reputationScore: true,
            earlyBirdCount: true,
            user: { select: { name: true } },
          },
        },
        checkIns: {
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            userId: true,
            day: true,
            status: true,
            createdAt: true,
            reflection: true,
            proofText: true,
            proofLink: true,
            aiSummary: true,
            aiConfidence: true,
            isEarlyBird: true,
            user: { select: { name: true } },
            tasks: { select: { title: true, isChallengeMode: true } },
            startFiles: { orderBy: { uploadedAt: "desc" }, take: 1, select: { url: true } },
            endFiles: { orderBy: { uploadedAt: "desc" }, take: 1, select: { url: true } },
            reactions: { select: { kind: true, userId: true } },
            verifications: { select: { reviewer: { select: { name: true } }, verdict: true } },
          },
        },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 20,
          select: {
            id: true,
            content: true,
            createdAt: true,
            imageName: true,
            imageUrl: true,
            user: { select: { name: true } },
            reactions: { select: { kind: true, userId: true } },
          },
        },
        penaltyEvents: {
          orderBy: { createdAt: "desc" },
          take: 10,
          select: {
            id: true,
            points: true,
            reason: true,
            createdAt: true,
            user: { select: { name: true } },
          },
        },
      },
    }),
    prisma.checkIn.findMany({
      where: { groupId: id, day: today },
      orderBy: { createdAt: "asc" },
      select: { userId: true, status: true, createdAt: true },
    }),
    prisma.checkIn.findMany({
      where: { groupId: id, day: { gte: weekStart, lte: today } },
      select: { userId: true, status: true },
    }),
    prisma.hallOfFame.findFirst({
      where: { groupId: id },
      orderBy: { weekStart: "desc" },
    }),
    prisma.task.findFirst({
      where: { groupId: id, day: today, earlyBirdCutoff: { not: null } },
      select: { earlyBirdCutoff: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.findMany({
      where: { groupId: id, userId: user.id, day: today },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!group) notFound();

  void weeklyCheckIns;

  const userMembership = group.users.find((member) => member.userId === user.id);
  const isLeader = userMembership?.role === "admin";

  const todayCheckInByUserId = new Map(todayCheckIns.map((checkIn) => [checkIn.userId, checkIn]));

  const leaderboardMembers = [...group.users].sort((left, right) => {
    if (board === "early") {
      const leftCheckIn = todayCheckInByUserId.get(left.userId);
      const rightCheckIn = todayCheckInByUserId.get(right.userId);
      if (leftCheckIn && rightCheckIn) {
        const byTime = leftCheckIn.createdAt.getTime() - rightCheckIn.createdAt.getTime();
        if (byTime !== 0) return byTime;
        return right.streak - left.streak;
      }
      if (leftCheckIn) return -1;
      if (rightCheckIn) return 1;
      if (right.streak !== left.streak) return right.streak - left.streak;
      return right.points - left.points;
    }
    if (right.points !== left.points) return right.points - left.points;
    if (right.reputationScore !== left.reputationScore) return right.reputationScore - left.reputationScore;
    return right.streak - left.streak;
  });

  const todayApprovedCount = todayCheckIns.filter((checkIn) => checkIn.status === "APPROVED").length;
  const todayPendingCount = todayCheckIns.filter((checkIn) => checkIn.status === "PENDING").length;
  const userHasSubmittedToday = Boolean(todayCheckInByUserId.get(user.id));
  const myRank = leaderboardMembers.findIndex((member) => member.userId === user.id);
  const maxPoints = leaderboardMembers[0]?.points ?? 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 pb-20 duration-500 md:pb-0">
      <div className="mb-6 flex items-start justify-between gap-4 border-b border-border pb-6">
        <div className="flex items-center gap-4">
          <div className="shrink-0 rounded-2xl border border-primary/20 bg-primary/10 p-3">
            <Users className="h-7 w-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{group.name}</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {group.description || "See what your peers are working on today."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                {getGroupFocusLabel(group.focusType)}
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                {getPenaltyModeLabel(group.penaltyMode)}
              </span>
              <span className="rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
                {getTaskPostingModeLabel(group.taskPostingMode)}
              </span>
            </div>
          </div>
        </div>
        <MidnightCountdown submitted={userHasSubmittedToday} />
      </div>

      <GroupNav groupId={id} active="feed" />

      <div className="mt-5">
        {userHasSubmittedToday ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5">
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-emerald-300">You&apos;ve submitted today</p>
              <p className="mt-0.5 text-xs text-emerald-400/70">
                Submitted at{" "}
                {todayCheckInByUserId
                  .get(user.id)
                  ?.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                {" · "}
                {todayCheckInByUserId.get(user.id)?.status === "APPROVED" ? "Approved ✓" : "Pending peer review"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5">
            <div className="flex min-w-0 items-center gap-3">
              <Clock3 className="h-5 w-5 shrink-0 text-amber-400" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Submit today&apos;s proof before midnight</p>
                <p className="mt-0.5 hidden text-xs text-amber-400/70 sm:block">
                  Upload start photo, end photo, and reflection.
                </p>
              </div>
            </div>
            <a
              href="#checkin-form"
              className="shrink-0 whitespace-nowrap rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-300 transition-colors hover:bg-amber-500/25"
            >
              Submit Now →
            </a>
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          {
            label: "Members",
            value: group.users.length,
            icon: Users,
            color: "text-sky-400",
            bg: "bg-sky-500/10 border-sky-500/20",
          },
          {
            label: "Submitted Today",
            value: todayCheckIns.length,
            icon: CheckCircle2,
            color: "text-emerald-400",
            bg: "bg-emerald-500/10 border-emerald-500/20",
          },
          {
            label: "Pending Review",
            value: todayPendingCount,
            icon: Clock3,
            color: "text-amber-400",
            bg: "bg-amber-500/10 border-amber-500/20",
          },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="flex items-center gap-3 rounded-2xl border border-border bg-card/50 p-4">
              <div className={`shrink-0 rounded-xl border p-2.5 ${card.bg}`}>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs text-muted-foreground">{card.label}</p>
                <p className="text-lg font-bold text-foreground">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {hallOfFame && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-400">
              This week&apos;s grinder
            </p>
            <p className="text-lg font-bold text-foreground">{hallOfFame.topName}</p>
            <p className="mt-0.5 text-sm text-amber-300/80">{hallOfFame.topStat}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-rose-400">
              This week&apos;s slacker
            </p>
            <p className="text-lg font-bold text-foreground">{hallOfFame.bottomName}</p>
            <p className="mt-0.5 text-sm text-rose-300/80">{hallOfFame.bottomStat}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_280px]">
        <div className="min-w-0 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today&apos;s Submissions</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {todayApprovedCount} approved · {todayPendingCount} pending
              </p>
            </div>
            <span className="rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
              {group.checkIns.length} recent
            </span>
          </div>

          {group.checkIns.length > 0 ? (
            group.checkIns.map((checkIn) => (
              <CheckinCard
                key={checkIn.id}
                checkInId={checkIn.id}
                user={checkIn.user.name}
                time={formatDayKey(checkIn.day)}
                status={checkIn.status}
                reflection={checkIn.reflection || "Submitted work proof for today."}
                tasks={checkIn.tasks.map((task) => task.title)}
                startUrl={checkIn.startFiles[0]?.url ?? null}
                endUrl={checkIn.endFiles[0]?.url ?? null}
                canReview={checkIn.userId !== user.id}
                isLeader={isLeader && checkIn.userId !== user.id}
                isEarlyBird={checkIn.isEarlyBird}
                isChallengeMode={checkIn.tasks.some((task) => task.isChallengeMode)}
                verifications={checkIn.verifications}
                reactions={(["FIRE", "STRONG", "THINKING", "EYES"] as const).map((kind) => ({
                  kind,
                  count: checkIn.reactions.filter((reaction) => reaction.kind === kind).length,
                  active: checkIn.reactions.some(
                    (reaction) => reaction.kind === kind && reaction.userId === user.id,
                  ),
                }))}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/20 px-6 py-16 text-center">
              <CheckCircle2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm font-medium text-muted-foreground">No submissions yet</p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Be the first one to post today&apos;s proof.
              </p>
            </div>
          )}

          <GroupChatPanel
            groupId={id}
            messages={group.messages.map((message) => ({
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              imageName: message.imageName,
              imageUrl: message.imageUrl,
              userName: message.user.name,
              reactions: (["FIRE", "CLAP", "TARGET", "ROCKET"] as const).map((kind) => ({
                kind,
                count: message.reactions.filter((reaction) => reaction.kind === kind).length,
                active: message.reactions.some(
                  (reaction) => reaction.kind === kind && reaction.userId === user.id,
                ),
              })),
            }))}
          />
        </div>

        <div className="min-w-0 space-y-4 lg:sticky lg:top-4">
          <div id="checkin-form" className="rounded-2xl border border-border bg-card/50 p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-foreground">Today&apos;s Check-in</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Upload both proofs before midnight.</p>
                {earlyBirdTask?.earlyBirdCutoff && (
                  <p className="mt-1 text-xs text-amber-400">
                    Early bird cutoff:{" "}
                    {earlyBirdTask.earlyBirdCutoff.toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                )}
              </div>
            </div>
            <CheckinForm groupId={id} tasks={userTasks} />
          </div>

          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <div className="mb-4 flex items-center gap-2.5">
              <Trophy className="h-4 w-4 text-amber-400" />
              <h3 className="text-base font-semibold text-foreground">Leaderboard</h3>
            </div>

            <div className="mb-4 flex gap-1.5 rounded-xl border border-border bg-muted/30 p-1">
              <a
                href={`/group/${id}/feed?board=points`}
                className={`flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors ${
                  board === "points"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Points
              </a>
              <a
                href={`/group/${id}/feed?board=early`}
                className={`flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors ${
                  board === "early"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Early Bird
              </a>
            </div>

            {myRank >= 0 && (
              <p className="mb-3 text-xs text-muted-foreground">
                Your rank: <span className="font-semibold text-foreground">#{myRank + 1}</span> of{" "}
                {leaderboardMembers.length}
              </p>
            )}

            <div className="space-y-2">
              {leaderboardMembers.slice(0, 5).map((member, index) => {
                const finish = todayCheckInByUserId.get(member.userId);
                const isMe = member.userId === user.id;
                const medals = ["🥇", "🥈", "🥉"];
                const barWidth = maxPoints > 0 ? Math.round((member.points / maxPoints) * 100) : 0;

                return (
                  <div
                    key={member.userId}
                    className={`rounded-xl border px-3 py-2.5 transition-colors ${
                      isMe
                        ? "border-primary/40 bg-primary/10"
                        : "border-border bg-muted/20 hover:bg-muted/30"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="w-6 shrink-0 text-center text-sm">
                          {index < 3 ? (
                            medals[index]
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{index + 1}</span>
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {member.user.name}
                            {isMe ? (
                              <span className="ml-1 text-xs font-normal text-muted-foreground">(you)</span>
                            ) : null}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {board === "early"
                              ? finish
                                ? finish.createdAt.toLocaleTimeString("en-IN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })
                                : "Not submitted"
                              : `${member.streak}🔥 · ${member.completions} done`}
                          </p>
                        </div>
                      </div>
                      <p className="shrink-0 text-sm font-bold text-primary">{member.points}p</p>
                    </div>
                    {board === "points" && (
                      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted/40">
                        <div
                          className="h-full rounded-full bg-primary/60 transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-3 space-y-1.5 border-t border-border pt-3">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                🔥 Streaks
              </p>
              {[...group.users]
                .sort((a, b) => b.streak - a.streak)
                .slice(0, 3)
                .map((member) => (
                  <div key={`s-${member.userId}`} className="flex items-center justify-between px-1 text-xs">
                    <span className="truncate text-foreground/80">{member.user.name}</span>
                    <span className="ml-2 shrink-0 font-semibold text-violet-400">{member.streak}d</span>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <MobileGroupNav groupId={id} active="feed" />
    </div>
  );
}
