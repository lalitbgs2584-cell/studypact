import { Trophy } from "lucide-react";
import { LeaderboardGroup } from "@/components/shared/leaderboard-group";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/studypact";
import { addDays, startOfDay } from "@/lib/studypact";

export default async function LeaderboardsPage() {
  const user = await requireSessionUser("/leaderboards");
  const today = startOfDay();
  const weekStart = addDays(today, -6);

  const groups = await prisma.group.findMany({
    where: { users: { some: { userId: user.id } } },
    include: {
      users: { include: { user: { select: { id: true, name: true } } } },
      checkIns: {
        where: { day: { gte: weekStart, lte: today } },
        select: { userId: true, status: true, createdAt: true, day: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-start gap-4 border-b border-border pb-6">
        <div className="rounded-2xl border border-accent/20 bg-accent/10 p-3">
          <Trophy className="h-7 w-7 text-accent" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Leaderboards</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rankings across your groups - daily, weekly, and all-time.
          </p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-background/60 px-6 py-16 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No leaderboards yet</p>
          <p className="mt-1 text-sm text-muted-foreground">Join a group and the rankings will appear here.</p>
        </div>
      ) : (
        groups.map((group) => (
          <LeaderboardGroup
            key={group.id}
            group={{
              id: group.id,
              name: group.name,
              members: group.users.map((member) => ({
                userId: member.userId,
                name: member.user.name,
                points: member.points,
                streak: member.streak,
                completions: member.completions,
                misses: member.misses,
                reputationScore: member.reputationScore,
              })),
              checkIns: group.checkIns.map((checkIn) => ({
                userId: checkIn.userId,
                status: checkIn.status,
                createdAt: checkIn.createdAt.toISOString(),
                day: checkIn.day.toISOString(),
              })),
            }}
            currentUserId={user.id}
            todayIso={today.toISOString()}
          />
        ))
      )}
    </div>
  );
}
