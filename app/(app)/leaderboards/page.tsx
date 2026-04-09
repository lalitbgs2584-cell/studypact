import { Trophy, Flame, CalendarDays, Crown } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/studypact";
import { addDays, startOfDay } from "@/lib/studypact";

type RankedMember = {
  userId: string;
  name: string;
  points: number;
  streak: number;
  reputationScore: number;
  completions: number;
  misses: number;
};

function getDailyRanking(members: RankedMember[], todayCheckIns: Map<string, Date>) {
  return [...members].sort((left, right) => {
    const leftCheckIn = todayCheckIns.get(left.userId);
    const rightCheckIn = todayCheckIns.get(right.userId);

    if (leftCheckIn && rightCheckIn) {
      const byTime = leftCheckIn.getTime() - rightCheckIn.getTime();
      if (byTime !== 0) return byTime;
      return right.streak - left.streak;
    }

    if (leftCheckIn) return -1;
    if (rightCheckIn) return 1;

    if (right.streak !== left.streak) return right.streak - left.streak;
    return right.points - left.points;
  });
}

function getWeeklyRanking(
  members: RankedMember[],
  weeklyApprovedByUser: Map<string, number>,
  weeklyFlaggedByUser: Map<string, number>,
) {
  return [...members].sort((left, right) => {
    const leftApproved = weeklyApprovedByUser.get(left.userId) ?? 0;
    const rightApproved = weeklyApprovedByUser.get(right.userId) ?? 0;
    if (rightApproved !== leftApproved) return rightApproved - leftApproved;

    const leftFlagged = weeklyFlaggedByUser.get(left.userId) ?? 0;
    const rightFlagged = weeklyFlaggedByUser.get(right.userId) ?? 0;
    if (leftFlagged !== rightFlagged) return leftFlagged - rightFlagged;

    return right.points - left.points;
  });
}

function getAllTimeRanking(members: RankedMember[]) {
  return [...members].sort((left, right) => {
    if (right.points !== left.points) return right.points - left.points;
    if (right.reputationScore !== left.reputationScore) return right.reputationScore - left.reputationScore;
    return right.streak - left.streak;
  });
}

function LeaderboardCard({
  title,
  subtitle,
  icon,
  members,
  currentUserId,
  metric,
}: {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  members: RankedMember[];
  currentUserId: string;
  metric: (member: RankedMember) => string;
}) {
  return (
    <div className="rounded-3xl border border-zinc-800/70 bg-black/25 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3 mb-5">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-3 text-primary">
          {icon}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <p className="text-sm text-zinc-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-3">
        {members.slice(0, 5).map((member, index) => {
          const isCurrentUser = member.userId === currentUserId;

          return (
            <div
              key={`${title}-${member.userId}`}
              className={`rounded-2xl border px-4 py-3 ${
                isCurrentUser
                  ? "border-primary/30 bg-primary/10"
                  : "border-zinc-800 bg-zinc-950/50"
              }`}
            >
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">
                    {index + 1}. {member.name}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {member.completions} completions • {member.misses} misses • {member.reputationScore} rep
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-primary">{metric(member)}</p>
                  <p className="text-xs text-zinc-500">{member.streak} day streak</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default async function LeaderboardsPage() {
  const user = await requireSessionUser("/leaderboards");
  const today = startOfDay();
  const weekStart = addDays(today, -6);

  const groups = await prisma.group.findMany({
    where: {
      users: {
        some: {
          userId: user.id,
        },
      },
    },
    include: {
      users: {
        include: {
          user: true,
        },
      },
      checkIns: {
        where: {
          day: {
            gte: weekStart,
            lte: today,
          },
        },
        select: {
          userId: true,
          status: true,
          createdAt: true,
          day: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-start gap-4 border-b border-zinc-800/80 pb-6">
        <div className="rounded-3xl border border-amber-500/20 bg-amber-500/10 p-4">
          <Trophy className="w-8 h-8 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Leaderboards</h1>
          <p className="text-zinc-400">
            Track the fastest finishers, weekly consistency, and all-time point leaders across your groups.
          </p>
        </div>
      </div>

      {groups.length ? (
        <div className="space-y-10">
          {groups.map((group) => {
            const members: RankedMember[] = group.users.map((membership) => ({
              userId: membership.userId,
              name: membership.user.name,
              points: membership.points,
              streak: membership.streak,
              reputationScore: membership.reputationScore,
              completions: membership.completions,
              misses: membership.misses,
            }));

            const todayCheckIns = new Map(
              group.checkIns
                .filter((checkIn) => checkIn.day.getTime() === today.getTime())
                .map((checkIn) => [checkIn.userId, checkIn.createdAt]),
            );

            const weeklyApprovedByUser = new Map<string, number>();
            const weeklyFlaggedByUser = new Map<string, number>();

            for (const checkIn of group.checkIns) {
              if (checkIn.status === "APPROVED") {
                weeklyApprovedByUser.set(
                  checkIn.userId,
                  (weeklyApprovedByUser.get(checkIn.userId) ?? 0) + 1,
                );
              }

              if (checkIn.status === "FLAGGED" || checkIn.status === "REJECTED") {
                weeklyFlaggedByUser.set(
                  checkIn.userId,
                  (weeklyFlaggedByUser.get(checkIn.userId) ?? 0) + 1,
                );
              }
            }

            const dailyRanking = getDailyRanking(members, todayCheckIns);
            const weeklyRanking = getWeeklyRanking(members, weeklyApprovedByUser, weeklyFlaggedByUser);
            const allTimeRanking = getAllTimeRanking(members);

            return (
              <section key={group.id} className="space-y-5">
                <div>
                  <h2 className="text-2xl font-semibold text-white">{group.name}</h2>
                  <p className="text-sm text-zinc-500">
                    {group.users.length} members competing in this accountability circle
                  </p>
                </div>

                <div className="grid gap-6 xl:grid-cols-3">
                  <LeaderboardCard
                    title="Daily Race"
                    subtitle="Earliest valid submissions rise to the top"
                    icon={<Flame className="w-5 h-5" />}
                    members={dailyRanking}
                    currentUserId={user.id}
                    metric={(member) =>
                      todayCheckIns.get(member.userId)
                        ? todayCheckIns.get(member.userId)!.toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "Pending"
                    }
                  />

                  <LeaderboardCard
                    title="Weekly Consistency"
                    subtitle="Approved proof over the last 7 days"
                    icon={<CalendarDays className="w-5 h-5" />}
                    members={weeklyRanking}
                    currentUserId={user.id}
                    metric={(member) => `${weeklyApprovedByUser.get(member.userId) ?? 0} approved`}
                  />

                  <LeaderboardCard
                    title="All-time Points"
                    subtitle="Long-term performance and reputation"
                    icon={<Crown className="w-5 h-5" />}
                    members={allTimeRanking}
                    currentUserId={user.id}
                    metric={(member) => `${member.points} pts`}
                  />
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-black/20 px-6 py-16 text-center">
          <h2 className="text-2xl font-semibold text-white">No leaderboards yet</h2>
          <p className="mt-2 text-zinc-500">
            Join a group first and the rankings will appear here automatically.
          </p>
        </div>
      )}
    </div>
  );
}
