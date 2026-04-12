import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { GroupNav } from "@/components/shared/group-nav";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { notFound } from "next/navigation";
import { FileWarning, ShieldAlert, Trophy } from "lucide-react";

export default async function GroupLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/ledger`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) {
    notFound();
  }

  const [penalties, members] = await Promise.all([
    prisma.penaltyEvent.findMany({
      where: { groupId: id },
      include: { user: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.userGroup.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // Aggregate penalty totals per member
  const penaltyByUser = new Map<string, { totalPoints: number; eventCount: number }>();
  for (const penalty of penalties) {
    const current = penaltyByUser.get(penalty.userId) ?? { totalPoints: 0, eventCount: 0 };
    penaltyByUser.set(penalty.userId, {
      totalPoints: current.totalPoints + penalty.points,
      eventCount: current.eventCount + 1,
    });
  }

  const scoreboard = members
    .map((m) => ({
      userId: m.userId,
      name: m.user.name,
      totalPoints: penaltyByUser.get(m.userId)?.totalPoints ?? 0,
      eventCount: penaltyByUser.get(m.userId)?.eventCount ?? 0,
    }))
    .sort((a, b) => b.totalPoints - a.totalPoints);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <FileWarning className="w-8 h-8 text-amber-500" /> Defaults Ledger
        </h1>
        <p className="text-zinc-400">
          Record of missed check-ins and deducted points for {membership.group.name}.
        </p>
      </div>

      <GroupNav groupId={id} active="ledger" />

      {/* Penalty Scoreboard */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Trophy className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-white">Penalty Scoreboard</h2>
            <p className="text-sm text-zinc-500">Members ranked by total penalty points accumulated.</p>
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800/70 bg-black/20 overflow-hidden">
          {scoreboard.map((member, index) => {
            const isPenalized = member.totalPoints > 0;
            const isCurrentUser = member.userId === user.id;
            return (
              <div
                key={member.userId}
                className={`flex items-center justify-between px-5 py-4 border-b border-zinc-800/50 last:border-0 ${
                  isCurrentUser ? "bg-primary/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-sm font-mono text-zinc-500 w-6 text-center">{index + 1}</span>
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center shrink-0">
                    <span className="text-sm font-bold text-zinc-300">{member.name.charAt(0).toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {member.name}{isCurrentUser && <span className="ml-2 text-xs text-zinc-500">(you)</span>}
                    </p>
                    <p className="text-xs text-zinc-500">{member.eventCount} penalty {member.eventCount === 1 ? "event" : "events"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge
                    className={isPenalized
                      ? "bg-red-500/15 text-red-400 border-red-500/20"
                      : "bg-emerald-500/15 text-emerald-400 border-emerald-500/20"
                    }
                  >
                    {isPenalized ? "Penalized" : "Good standing"}
                  </Badge>
                  <span className={`text-sm font-semibold tabular-nums ${
                    isPenalized ? "text-red-400" : "text-zinc-500"
                  }`}>
                    {isPenalized ? `-${member.totalPoints} pts` : "0 pts"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Full penalty event log */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">Penalty Log</h2>
        {penalties.length > 0 ? (
          penalties.map((penalty) => (
            <Card key={penalty.id} className="bg-red-950/10 border-red-900/30 overflow-hidden relative">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500/50"></div>
              <CardContent className="p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                    <ShieldAlert className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-white">{penalty.user.name}</h3>
                    <p className="text-zinc-400 text-sm">{penalty.reason}</p>
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="destructive" className="bg-red-500/20 text-red-500 border-none px-3 py-1 text-sm">-{penalty.points} pts</Badge>
                  <div className="text-xs text-zinc-500 mt-2">{new Date(penalty.createdAt).toLocaleString("en-IN")}</div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="py-20 flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-2xl bg-black/20">
            <FileWarning className="w-12 h-12 text-zinc-700 mb-4" />
            <h3 className="text-xl font-medium text-zinc-300">Clean Record</h3>
            <p className="text-zinc-500 mt-1">No penalties have been issued in this group yet.</p>
          </div>
        )}
      </div>
    </div>
  );
}
