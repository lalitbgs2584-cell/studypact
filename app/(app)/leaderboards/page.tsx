import { Trophy } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/studypact";
import { addDays, startOfDay } from "@/lib/studypact";

const MEDALS = ["🥇", "🥈", "🥉"];

function medal(index: number) {
  return MEDALS[index] ?? `${index + 1}`;
}

const RANK_STYLES = [
  "border-l-4 border-amber-400 bg-amber-500/5",
  "border-l-4 border-zinc-400 bg-zinc-400/5",
  "border-l-4 border-amber-700/60 bg-amber-700/5",
];

function rankStyle(index: number) {
  return RANK_STYLES[index] ?? "";
}

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
      <div className="flex items-start gap-4 border-b border-zinc-800/80 pb-6">
        <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-3">
          <Trophy className="w-7 h-7 text-amber-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Leaderboards</h1>
          <p className="text-zinc-400 mt-1 text-sm">Rankings across your groups — daily, weekly, and all-time.</p>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-6 py-16 text-center">
          <Trophy className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-lg font-semibold text-white">No leaderboards yet</p>
          <p className="mt-1 text-zinc-500 text-sm">Join a group and the rankings will appear here.</p>
        </div>
      ) : (
        groups.map((group) => {
          const todayCheckIns = new Map(
            group.checkIns
              .filter((c) => c.day.getTime() === today.getTime())
              .map((c) => [c.userId, c.createdAt]),
          );

          const weeklyApproved = new Map<string, number>();
          for (const c of group.checkIns) {
            if (c.status === "APPROVED") {
              weeklyApproved.set(c.userId, (weeklyApproved.get(c.userId) ?? 0) + 1);
            }
          }

          const daily = [...group.users].sort((a, b) => {
            const at = todayCheckIns.get(a.userId);
            const bt = todayCheckIns.get(b.userId);
            if (at && bt) return at.getTime() - bt.getTime();
            if (at) return -1;
            if (bt) return 1;
            return b.streak - a.streak;
          });

          const weekly = [...group.users].sort((a, b) => {
            const diff = (weeklyApproved.get(b.userId) ?? 0) - (weeklyApproved.get(a.userId) ?? 0);
            return diff !== 0 ? diff : b.points - a.points;
          });

          const allTime = [...group.users].sort((a, b) => {
            return b.points !== a.points ? b.points - a.points : b.streak - a.streak;
          });

          return (
            <section key={group.id} className="space-y-5">
              <div>
                <h2 className="text-xl font-bold text-white">{group.name}</h2>
                <p className="text-sm text-zinc-500">{group.users.length} members</p>
              </div>

              <div className="grid gap-5 lg:grid-cols-3">
                {/* Daily */}
                <div className="rounded-2xl border border-zinc-800 bg-black/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <span className="text-base">⚡</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Daily Race</p>
                      <p className="text-xs text-zinc-500">Earliest submission wins</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {(() => {
                      const myRank = daily.findIndex((m) => m.userId === user.id);
                      return (
                        <>
                          {myRank >= 0 && (
                            <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800/60">
                              Your rank: #{myRank + 1} of {daily.length} members
                            </p>
                          )}
                          {daily.slice(0, 5).map((m, i) => {
                            const checkInTime = todayCheckIns.get(m.userId);
                            const isMe = m.userId === user.id;
                            return (
                              <div key={m.userId} className={`flex items-center gap-3 px-4 py-3 ${rankStyle(i)} ${isMe ? "ring-1 ring-primary/40" : ""}`}>
                                <span className="text-base w-6 text-center shrink-0">{medal(i)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {m.user.name}{isMe && <span className="text-zinc-400 text-xs ml-1">(you)</span>}
                                  </p>
                                  <p className="text-xs text-zinc-500">{m.streak} day streak</p>
                                </div>
                                <span className={`text-xs font-semibold shrink-0 ${checkInTime ? "text-emerald-400" : "text-zinc-600"}`}>
                                  {checkInTime
                                    ? checkInTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })
                                    : "Pending"}
                                </span>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* Weekly */}
                <div className="rounded-2xl border border-zinc-800 bg-black/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <span className="text-base">📅</span>
                    <div>
                      <p className="text-sm font-semibold text-white">Weekly</p>
                      <p className="text-xs text-zinc-500">Approved check-ins this week</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {(() => {
                      const myRank = weekly.findIndex((m) => m.userId === user.id);
                      return (
                        <>
                          {myRank >= 0 && (
                            <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800/60">
                              Your rank: #{myRank + 1} of {weekly.length} members
                            </p>
                          )}
                          {weekly.slice(0, 5).map((m, i) => {
                            const approved = weeklyApproved.get(m.userId) ?? 0;
                            const isMe = m.userId === user.id;
                            return (
                              <div key={m.userId} className={`flex items-center gap-3 px-4 py-3 ${rankStyle(i)} ${isMe ? "ring-1 ring-primary/40" : ""}`}>
                                <span className="text-base w-6 text-center shrink-0">{medal(i)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {m.user.name}{isMe && <span className="text-zinc-400 text-xs ml-1">(you)</span>}
                                  </p>
                                  <p className="text-xs text-zinc-500">{m.completions} total completions</p>
                                </div>
                                <span className="text-xs font-semibold text-primary shrink-0">
                                  {approved}/7
                                </span>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>

                {/* All-time */}
                <div className="rounded-2xl border border-zinc-800 bg-black/40 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
                    <span className="text-base">👑</span>
                    <div>
                      <p className="text-sm font-semibold text-white">All-time</p>
                      <p className="text-xs text-zinc-500">Total points earned</p>
                    </div>
                  </div>
                  <div className="divide-y divide-zinc-800/60">
                    {(() => {
                      const myRank = allTime.findIndex((m) => m.userId === user.id);
                      return (
                        <>
                          {myRank >= 0 && (
                            <p className="px-4 py-2 text-xs text-zinc-500 border-b border-zinc-800/60">
                              Your rank: #{myRank + 1} of {allTime.length} members
                            </p>
                          )}
                          {allTime.slice(0, 5).map((m, i) => {
                            const isMe = m.userId === user.id;
                            return (
                              <div key={m.userId} className={`flex items-center gap-3 px-4 py-3 ${rankStyle(i)} ${isMe ? "ring-1 ring-primary/40" : ""}`}>
                                <span className="text-base w-6 text-center shrink-0">{medal(i)}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-white truncate">
                                    {m.user.name}{isMe && <span className="text-zinc-400 text-xs ml-1">(you)</span>}
                                  </p>
                                  <p className="text-xs text-zinc-500">{m.streak} streak · {m.reputationScore} rep</p>
                                </div>
                                <span className="text-xs font-semibold text-amber-400 shrink-0">
                                  {m.points} pts
                                </span>
                              </div>
                            );
                          })}
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
