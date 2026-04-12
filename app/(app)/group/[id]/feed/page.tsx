import { CheckCircle2, Clock3, ShieldAlert, Trophy, Users, Zap, TrendingUp, Activity } from "lucide-react";
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
        startFiles: {
          orderBy: { uploadedAt: "desc" },
          take: 10,
          select: { id: true, name: true, uploadedAt: true, user: { select: { name: true } } },
        },
        endFiles: {
          orderBy: { uploadedAt: "desc" },
          take: 10,
          select: { id: true, name: true, uploadedAt: true, user: { select: { name: true } } },
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

  const userMembership = group.users.find((m) => m.userId === user.id);
  const isLeader = userMembership?.role === "admin";

  const todayCheckInByUserId = new Map(todayCheckIns.map((c) => [c.userId, c]));
  const weeklyStatsByUserId = new Map<string, { completed: number; flagged: number }>();

  for (const checkIn of weeklyCheckIns) {
    const current = weeklyStatsByUserId.get(checkIn.userId) ?? { completed: 0, flagged: 0 };
    if (checkIn.status === "APPROVED") current.completed += 1;
    if (checkIn.status === "FLAGGED" || checkIn.status === "REJECTED") current.flagged += 1;
    weeklyStatsByUserId.set(checkIn.userId, current);
  }

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

  const weeklyLeaderboard = [...group.users]
    .sort((left, right) => {
      const leftStats = weeklyStatsByUserId.get(left.userId) ?? { completed: 0, flagged: 0 };
      const rightStats = weeklyStatsByUserId.get(right.userId) ?? { completed: 0, flagged: 0 };
      if (rightStats.completed !== leftStats.completed) return rightStats.completed - leftStats.completed;
      if (leftStats.flagged !== rightStats.flagged) return leftStats.flagged - rightStats.flagged;
      return right.points - left.points;
    })
    .slice(0, 5);

  const weeklyPenaltyPool = group.penaltyEvents
    .filter((p) => p.createdAt >= weekStart)
    .reduce((sum, p) => sum + p.points, 0);

  const todayApprovedCount = todayCheckIns.filter((c) => c.status === "APPROVED").length;
  const todayPendingCount = todayCheckIns.filter((c) => c.status === "PENDING").length;
  const userHasSubmittedToday = Boolean(todayCheckInByUserId.get(user.id));

  const myRank = leaderboardMembers.findIndex((m) => m.userId === user.id);
  const maxPoints = leaderboardMembers[0]?.points ?? 1;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">

      {/* ── PAGE HEADER ── */}
      <div className="flex items-start justify-between gap-4 border-b border-border pb-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20 shrink-0">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">{group.name}</h1>
            <p className="text-muted-foreground text-sm mt-0.5">{group.description || "See what your peers are working on today."}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <span className="text-xs rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-muted-foreground">{getGroupFocusLabel(group.focusType)}</span>
              <span className="text-xs rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-muted-foreground">{getPenaltyModeLabel(group.penaltyMode)}</span>
              <span className="text-xs rounded-full border border-border bg-muted/40 px-2.5 py-0.5 text-muted-foreground">{getTaskPostingModeLabel(group.taskPostingMode)}</span>
            </div>
          </div>
        </div>
        <MidnightCountdown submitted={userHasSubmittedToday} />
      </div>

      {/* ── GROUP NAV ── */}
      <GroupNav groupId={id} active="feed" />

      {/* ── TODAY'S STATUS BANNER ── */}
      <div className="mt-5">
        {userHasSubmittedToday ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-3.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-emerald-300">You&apos;ve submitted today</p>
              <p className="text-xs text-emerald-400/70 mt-0.5">
                Submitted at {todayCheckInByUserId.get(user.id)?.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                {" · "}
                {todayCheckInByUserId.get(user.id)?.status === "APPROVED" ? "Approved ✓" : "Pending peer review"}
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-5 py-3.5">
            <div className="flex items-center gap-3 min-w-0">
              <Clock3 className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Submit today&apos;s proof before midnight</p>
                <p className="text-xs text-amber-400/70 mt-0.5 hidden sm:block">Upload start photo, end photo, and reflection.</p>
              </div>
            </div>
            <a
              href="#checkin-form"
              className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-sm font-medium text-amber-300 hover:bg-amber-500/25 transition-colors whitespace-nowrap"
            >
              Submit Now →
            </a>
          </div>
        )}
      </div>

      {/* ── 4 STAT CARDS ── */}
      <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Members", value: group.users.length, icon: Users, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20" },
          { label: "Submitted Today", value: todayCheckIns.length, icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
          { label: "Pending Review", value: todayPendingCount, icon: Clock3, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Weekly Penalties", value: `${weeklyPenaltyPool} pts`, icon: ShieldAlert, color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20" },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-border bg-card/50 p-4 flex items-center gap-3">
              <div className={`rounded-xl border p-2.5 shrink-0 ${card.bg}`}>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground truncate">{card.label}</p>
                <p className="text-lg font-bold text-foreground">{card.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── HALL OF FAME ── */}
      {hallOfFame && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-1">🏆 This week&apos;s grinder</p>
            <p className="text-lg font-bold text-foreground">{hallOfFame.topName}</p>
            <p className="text-sm text-amber-300/80 mt-0.5">{hallOfFame.topStat}</p>
          </div>
          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-5 py-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-rose-400 mb-1">😬 This week&apos;s slacker</p>
            <p className="text-lg font-bold text-foreground">{hallOfFame.bottomName}</p>
            <p className="text-sm text-rose-300/80 mt-0.5">{hallOfFame.bottomStat}</p>
          </div>
        </div>
      )}

      {/* ── MAIN 3-COLUMN GRID ──
          Left   → submissions feed (widest, scrollable content)
          Center → check-in form + group chat (action / communication)
          Right  → leaderboard + rankings (compact utility)
          Mobile: stacks vertically, check-in form first
      */}
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_300px_260px] xl:grid-cols-[1fr_320px_280px] gap-6 items-start">

        {/* ══ LEFT: SUBMISSIONS FEED ══ */}
        <div className="space-y-4 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Today&apos;s Submissions</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{todayApprovedCount} approved · {todayPendingCount} pending</p>
            </div>
            <span className="text-xs text-muted-foreground border border-border rounded-full px-3 py-1">{group.checkIns.length} recent</span>
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
                proofText={checkIn.proofText}
                proofLink={checkIn.proofLink}
                aiSummary={checkIn.aiSummary}
                aiConfidence={checkIn.aiConfidence}
                tasks={checkIn.tasks.map((t) => t.title)}
                startUrl={checkIn.startFiles[0]?.url ?? null}
                endUrl={checkIn.endFiles[0]?.url ?? null}
                canReview={checkIn.userId !== user.id}
                isLeader={isLeader && checkIn.userId !== user.id}
                isEarlyBird={checkIn.isEarlyBird}
                isChallengeMode={checkIn.tasks.some((t) => t.isChallengeMode)}
                reactions={(["FIRE", "STRONG", "THINKING", "EYES"] as const).map((kind) => ({
                  kind,
                  count: checkIn.reactions.filter((r) => r.kind === kind).length,
                  active: checkIn.reactions.some((r) => r.kind === kind && r.userId === user.id),
                }))}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-border bg-card/20 px-6 py-16 text-center">
              <CheckCircle2 className="w-8 h-8 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No submissions yet</p>
              <p className="text-xs text-muted-foreground/60 mt-1">Be the first one to post today&apos;s proof.</p>
            </div>
          )}
        </div>

        {/* ══ CENTER: CHECK-IN FORM + CHAT ══ */}
        <div className="space-y-4 min-w-0 lg:sticky lg:top-4">

          {/* Check-in Form */}
          <div id="checkin-form" className="rounded-2xl border border-border bg-card/50 p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h3 className="text-base font-semibold text-foreground">Today&apos;s Check-in</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Upload both proofs before midnight.</p>
                {earlyBirdTask?.earlyBirdCutoff && (
                  <p className="mt-1 text-xs text-amber-400">
                    🐦 Early bird cutoff: {earlyBirdTask.earlyBirdCutoff.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
            </div>
            <CheckinForm groupId={id} tasks={userTasks} />
          </div>

          {/* Group Chat */}
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
                count: message.reactions.filter((r) => r.kind === kind).length,
                active: message.reactions.some((r) => r.kind === kind && r.userId === user.id),
              })),
            }))}
          />
        </div>

        {/* ══ RIGHT: LEADERBOARD + RANKINGS ══ */}
        <div className="space-y-4 min-w-0 lg:sticky lg:top-4">

          {/* Leaderboard Panel */}
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <Trophy className="w-4 h-4 text-amber-400" />
              <h3 className="text-base font-semibold text-foreground">Leaderboard</h3>
            </div>

            {/* Board toggle */}
            <div className="flex gap-1.5 mb-4 p-1 rounded-xl bg-muted/30 border border-border">
              <a
                href={`/group/${id}/feed?board=points`}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-center transition-colors ${
                  board === "points"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Points
              </a>
              <a
                href={`/group/${id}/feed?board=early`}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-medium text-center transition-colors ${
                  board === "early"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Early Bird
              </a>
            </div>

            {myRank >= 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Your rank: <span className="font-semibold text-foreground">#{myRank + 1}</span> of {leaderboardMembers.length}
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
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm w-6 shrink-0 text-center">
                          {index < 3 ? medals[index] : <span className="text-xs text-muted-foreground font-bold">{index + 1}</span>}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {member.user.name}
                            {isMe && <span className="text-muted-foreground font-normal text-xs ml-1">(you)</span>}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {board === "early"
                              ? finish
                                ? finish.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                                : "Not submitted"
                              : `${member.streak}🔥 · ${member.completions} done`}
                          </p>
                        </div>
                      </div>
                      <p className="text-sm font-bold text-primary shrink-0">{member.points}p</p>
                    </div>
                    {board === "points" && (
                      <div className="mt-2 h-1 w-full rounded-full bg-muted/40 overflow-hidden">
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
          </div>

          {/* Weekly + Streaks — combined compact panel */}
          <div className="rounded-2xl border border-border bg-card/50 p-5">
            <div className="flex items-center gap-2.5 mb-4">
              <TrendingUp className="w-4 h-4 text-violet-400" />
              <h3 className="text-base font-semibold text-foreground">Rankings</h3>
            </div>

            <div className="space-y-4">
              {/* Weekly */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Weekly</p>
                <div className="space-y-1.5">
                  {weeklyLeaderboard.map((member, index) => {
                    const stats = weeklyStatsByUserId.get(member.userId) ?? { completed: 0, flagged: 0 };
                    return (
                      <div key={`${member.userId}-weekly`} className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-3 py-2">
                        <p className="text-sm text-foreground">
                          <span className="text-muted-foreground text-xs mr-1.5">{index + 1}.</span>
                          {member.user.name}
                        </p>
                        <p className="text-xs text-muted-foreground">{stats.completed} ✓</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Streaks */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">🔥 Streaks</p>
                <div className="space-y-1.5">
                  {[...group.users].sort((a, b) => b.streak - a.streak).slice(0, 4).map((member) => (
                    <div key={`streak-${member.userId}`} className="flex items-center justify-between rounded-lg border border-border bg-muted/10 px-3 py-2">
                      <p className="text-sm text-foreground">{member.user.name}</p>
                      <p className="text-xs font-semibold text-violet-400">{member.streak} days</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
        {/* ══ END RIGHT COLUMN ══ */}

      </div>

      {/* ── BOTTOM STRIP: PENALTY ENGINE + RECENT ACTIVITY ──
          These are supplementary panels that don't need to crowd the main grid.
          They span full width below in a 2-column layout.
      */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">

        {/* Penalty Engine */}
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2.5 mb-3">
            <Zap className="w-4 h-4 text-rose-400" />
            <h3 className="text-base font-semibold text-foreground">Penalty Engine</h3>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Weekly {group.penaltyMode === "POOL" ? "pool" : "burned"}: <span className="font-semibold text-foreground">{weeklyPenaltyPool} pts</span>
            {" · "}{group.dailyPenalty} pts/missed day
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">Approved today</p>
              <p className="text-xl font-bold text-emerald-400 mt-1">{todayApprovedCount}</p>
            </div>
            <div className="rounded-xl border border-border bg-muted/20 px-3 py-3 text-center">
              <p className="text-xs text-muted-foreground">Pending today</p>
              <p className="text-xl font-bold text-amber-400 mt-1">{todayPendingCount}</p>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="rounded-2xl border border-border bg-card/50 p-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Activity className="w-4 h-4 text-sky-400" />
            <h3 className="text-base font-semibold text-foreground">Recent Activity</h3>
          </div>

          {group.penaltyEvents.length > 0 || group.checkIns.length > 0 ? (
            <div className="space-y-2">
              {group.checkIns.slice(0, 5).map((c) => (
                <div key={`act-${c.id}`} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 border border-border bg-muted/10">
                  <div className={`mt-0.5 w-2 h-2 rounded-full shrink-0 ${c.status === "APPROVED" ? "bg-emerald-400" : c.status === "PENDING" ? "bg-amber-400" : "bg-rose-400"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{c.user.name} submitted a check-in</p>
                    <p className="text-xs text-muted-foreground capitalize">{c.status.toLowerCase()}</p>
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 ml-auto">
                    {c.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
              ))}
              {group.penaltyEvents.slice(0, 3).map((p) => (
                <div key={`pen-${p.id}`} className="flex items-start gap-2.5 rounded-lg px-3 py-2.5 border border-rose-500/20 bg-rose-500/5">
                  <div className="mt-0.5 w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{p.user.name} penalized</p>
                    <p className="text-xs text-rose-400/80">-{p.points} pts</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No activity yet today.</p>
          )}
        </div>

      </div>

      <MobileGroupNav groupId={id} active="feed" />
    </div>
  );
}
