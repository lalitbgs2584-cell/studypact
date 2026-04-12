import { CheckCircle2, Clock3, ShieldAlert, Trophy, Users, Star } from "lucide-react";
import { notFound } from "next/navigation";
import { CheckinCard } from "@/components/shared/checkin-card";
import { CheckinForm } from "@/components/shared/checkin-form";
import { GroupChatPanel } from "@/components/shared/group-chat-panel";
import { GroupNav } from "@/components/shared/group-nav";
import { MidnightCountdown } from "@/components/shared/midnight-countdown";
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

  const [group, todayCheckIns, weeklyCheckIns, hallOfFame, earlyBirdTask] = await Promise.all([
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

  const overviewCards = [
    { label: "Members", value: group.users.length, detail: "Active accountability partners", icon: Users, tone: "border-sky-500/20 bg-sky-500/10 text-sky-300" },
    { label: "Today's Submissions", value: todayCheckIns.length, detail: "Check-ins submitted so far", icon: CheckCircle2, tone: "border-emerald-500/20 bg-emerald-500/10 text-emerald-300" },
    { label: "Pending Reviews", value: todayPendingCount, detail: "Submissions waiting on peers", icon: Clock3, tone: "border-amber-500/20 bg-amber-500/10 text-amber-300" },
    { label: "Weekly Penalties", value: `${weeklyPenaltyPool} pts`, detail: group.penaltyMode === "POOL" ? "Current reward pool size" : "Points burned this week", icon: ShieldAlert, tone: "border-rose-500/20 bg-rose-500/10 text-rose-300" },
  ];

  const recentActivity = [
    ...group.users.map((m) => ({ id: `join-${m.userId}-${m.joinedAt.toISOString()}`, title: `${m.user.name} joined the group`, detail: `${m.role || "member"} joined the pact`, timestamp: m.joinedAt })),
    ...group.checkIns.map((c) => ({ id: `checkin-${c.id}`, title: `${c.user.name} submitted a check-in`, detail: c.status === "PENDING" ? "Waiting for peer review" : `Status: ${c.status.toLowerCase()}`, timestamp: c.createdAt })),
    ...group.penaltyEvents.map((p) => ({ id: `penalty-${p.id}`, title: `${p.user.name} was penalized`, detail: `-${p.points} pts | ${p.reason}`, timestamp: p.createdAt })),
    ...group.messages.map((m) => ({ id: `message-${m.id}`, title: `${m.user.name} posted in the group`, detail: m.content || m.imageName || "Shared a photo with the group", timestamp: m.createdAt })),
    ...group.startFiles.map((f) => ({ id: `start-${f.id}`, title: `${f.user.name} uploaded a start proof`, detail: f.name, timestamp: f.uploadedAt })),
    ...group.endFiles.map((f) => ({ id: `end-${f.id}`, title: `${f.user.name} uploaded an end proof`, detail: f.name, timestamp: f.uploadedAt })),
  ]
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 12);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6">
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <Users className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{group.name}</h1>
          <p className="text-zinc-400">{group.description || "See what your peers are working on today."}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{getGroupFocusLabel(group.focusType)}</span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{getPenaltyModeLabel(group.penaltyMode)}</span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{getTaskPostingModeLabel(group.taskPostingMode)}</span>
          </div>
        </div>
      </div>

      <GroupNav groupId={id} active="feed" />

      {/* Hall of Fame */}
      {hallOfFame && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2">🏆 This week&apos;s grinder</p>
            <p className="text-xl font-bold text-white">{hallOfFame.topName}</p>
            <p className="text-sm text-amber-300 mt-1">{hallOfFame.topStat}</p>
          </div>
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-red-400 mb-2">😬 This week&apos;s slacker</p>
            <p className="text-xl font-bold text-white">{hallOfFame.bottomName}</p>
            <p className="text-sm text-red-300 mt-1">{hallOfFame.bottomStat}</p>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {overviewCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-zinc-800/70 bg-black/20 p-5 backdrop-blur-lg">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">{card.label}</p>
                  <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
                  <p className="mt-1 text-sm text-zinc-500">{card.detail}</p>
                </div>
                <div className={`rounded-2xl border p-3 ${card.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-black/20 p-5 backdrop-blur-lg">
            <div className="flex flex-col gap-4 border-b border-zinc-800/60 pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">Latest Submissions</h2>
                <p className="mt-1 text-sm text-zinc-500">Track proof quality, review status, and the latest work from the group.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{group.checkIns.length} recent check-ins</span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{todayApprovedCount} approved today</span>
                <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">{todayPendingCount} pending review</span>
              </div>
            </div>

            <div className="mt-5 space-y-5">
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
                    startUrl={checkIn.startFiles[0]?.url}
                    endUrl={checkIn.endFiles[0]?.url}
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
                <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-6 py-12 text-center text-zinc-400">
                  No submissions yet. Be the first one to post today&apos;s proof.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-3xl border border-zinc-800/70 bg-black/20 p-5 backdrop-blur-lg">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Today&apos;s Check-in</h3>
                <p className="text-sm text-zinc-500">Upload both proofs early so review goes smoothly.</p>
                {earlyBirdTask?.earlyBirdCutoff && (
                  <p className="mt-1 text-xs text-amber-400">
                    🐦 Early bird cutoff: {earlyBirdTask.earlyBirdCutoff.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                )}
              </div>
              <MidnightCountdown submitted={userHasSubmittedToday} />
            </div>
            <CheckinForm groupId={id} />
          </div>

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

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <Trophy className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-zinc-100">Leaderboard</h3>
                  <p className="text-xs text-zinc-500">{board === "early" ? "Today's fastest submissions" : "Points, streak, and rep"}</p>
                </div>
              </div>

              <div className="mb-4 flex flex-wrap gap-2">
                <a href={`/group/${id}/feed?board=points`} className={`rounded-full px-3 py-1 text-xs font-medium ${board === "points" ? "bg-primary text-primary-foreground" : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}>Points Board</a>
                <a href={`/group/${id}/feed?board=early`} className={`rounded-full px-3 py-1 text-xs font-medium ${board === "early" ? "bg-primary text-primary-foreground" : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}>Early Finishers</a>
              </div>

              <div className="space-y-3">
                {leaderboardMembers.slice(0, 5).map((member, index) => {
                  const finish = todayCheckInByUserId.get(member.userId);
                  return (
                    <div key={member.userId} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                      <div>
                        <p className="text-sm font-medium text-white flex items-center gap-1.5">
                          {index + 1}. {member.user.name}
                          {member.earlyBirdCount > 0 && <span className="text-xs text-amber-400">🐦 {member.earlyBirdCount}</span>}
                        </p>
                        {board === "early" ? (
                          <p className="text-xs text-zinc-500">{finish ? `Submitted ${finish.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "No submission yet"} | {member.streak} streak</p>
                        ) : (
                          <p className="text-xs text-zinc-500">{member.completions} completions | {member.misses} misses | {member.reputationScore} rep</p>
                        )}
                      </div>
                      <div className="text-right">
                        {board === "early" ? (
                          <>
                            <p className="text-sm font-semibold text-primary">{finish ? `#${index + 1} today` : "Pending"}</p>
                            <p className="text-xs text-zinc-500">{member.points} pts | {member.reputationScore} rep</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-semibold text-primary">{member.points} pts</p>
                            <p className="text-xs text-zinc-500">{member.streak} streak | best: {member.bestStreak}</p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
              <h3 className="text-lg font-semibold text-zinc-100 mb-2">Penalty Engine</h3>
              <p className="text-sm text-zinc-400">Weekly {group.penaltyMode === "POOL" ? "reward pool" : "burn total"}: {weeklyPenaltyPool} pts</p>
              <p className="mt-2 text-xs text-zinc-500">Daily penalty is {group.dailyPenalty} pts per missed or flagged day.</p>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Approved today</p>
                  <p className="mt-2 text-2xl font-bold text-white">{todayApprovedCount}</p>
                </div>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                  <p className="text-xs uppercase tracking-wider text-zinc-500">Pending today</p>
                  <p className="mt-2 text-2xl font-bold text-white">{todayPendingCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Weekly and All-time</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">Weekly leaderboard</p>
                <div className="space-y-2">
                  {weeklyLeaderboard.map((member, index) => {
                    const stats = weeklyStatsByUserId.get(member.userId) ?? { completed: 0, flagged: 0 };
                    return (
                      <div key={`${member.userId}-weekly`} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                        <p className="text-sm font-medium text-white">{index + 1}. {member.user.name}</p>
                        <p className="text-xs text-zinc-500">{stats.completed} approved | {stats.flagged} flagged | {member.points} pts</p>
                      </div>
                    );
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-zinc-500 mb-2">All-time leaderboard</p>
                <div className="space-y-2">
                  {leaderboardMembers.slice(0, 3).map((member, index) => (
                    <div key={`${member.userId}-alltime`} className="rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                      <p className="text-sm font-medium text-white">{index + 1}. {member.user.name}</p>
                      <p className="text-xs text-zinc-500">{member.points} pts | {member.completions} completions | {member.reputationScore} rep</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Member streaks panel */}
          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
            <div className="flex items-center gap-3 mb-4">
              <Star className="w-5 h-5 text-violet-400" />
              <h3 className="text-lg font-semibold text-zinc-100">Streaks</h3>
            </div>
            <div className="space-y-2">
              {[...group.users].sort((a, b) => b.streak - a.streak).map((member) => (
                <div key={`streak-${member.userId}`} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-2">
                  <p className="text-sm text-white">{member.user.name}</p>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-violet-400">🔥 {member.streak} day streak</p>
                    <p className="text-xs text-zinc-500">best: {member.bestStreak}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Recent Activity</h3>
            {recentActivity.length ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-3">
                    <p className="text-sm font-medium text-zinc-100">{activity.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{activity.detail}</p>
                    <p className="mt-2 text-xs text-zinc-500">{activity.timestamp.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                Activity will appear here as members join, upload proof, and get reviewed.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
