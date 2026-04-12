import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { GroupNav } from "@/components/shared/group-nav";
import { prisma } from "@/lib/db";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { RedemptionClient } from "./redemption-client";

export default async function GroupRedemptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/redemption`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) notFound();

  const [members, redemptionTasks, penaltyEvents] = await Promise.all([
    prisma.userGroup.findMany({
      where: { groupId: id },
      include: { user: { select: { id: true, name: true, penaltyCount: true } } },
    }),
    prisma.redemptionTask.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.penaltyEvent.findMany({
      where: { groupId: id },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { id: true, userId: true, reason: true, points: true, createdAt: true },
    }),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <ShieldCheck className="w-8 h-8 text-emerald-400" /> Penalty Redemption
        </h1>
        <p className="text-zinc-400">
          Leaders can issue a harder task to penalized members. Completing it wipes one penalty point.
        </p>
      </div>

      <GroupNav groupId={id} active="redemption" />

      <RedemptionClient
        groupId={id}
        isAdmin={membership.role === "admin"}
        currentUserId={user.id}
        members={members.map((m) => ({ id: m.user.id, name: m.user.name, penaltyCount: m.user.penaltyCount }))}
        redemptionTasks={redemptionTasks.map((t) => ({
          id: t.id,
          title: t.title,
          details: t.details,
          status: t.status,
          targetUserId: t.targetUserId,
          startFileUrl: t.startFileUrl,
          endFileUrl: t.endFileUrl,
          reflection: t.reflection,
          createdAt: t.createdAt,
          targetName: members.find((m) => m.userId === t.targetUserId)?.user.name ?? "Unknown",
        }))}
        penaltyEvents={penaltyEvents.map((p) => ({
          id: p.id,
          userId: p.userId,
          reason: p.reason,
          points: p.points,
          createdAt: p.createdAt,
          userName: members.find((m) => m.userId === p.userId)?.user.name ?? "Unknown",
        }))}
      />
    </div>
  );
}
