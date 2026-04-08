import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/db";
import { GroupNav } from "@/components/shared/group-nav";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { notFound } from "next/navigation";
import { FileWarning, ShieldAlert } from "lucide-react";

export default async function GroupLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/ledger`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) {
    notFound();
  }

  const penalties = await prisma.penaltyEvent.findMany({
    where: {
      groupId: id,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

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

      <div className="space-y-4">
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
