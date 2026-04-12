import { notFound } from "next/navigation";
import { MessageSquareDashed } from "lucide-react";
import { GroupNav } from "@/components/shared/group-nav";
import { prisma } from "@/lib/db";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { startOfDay } from "@/lib/studypact";
import { ConfessionsClient } from "./confessions-client";

export default async function GroupConfessionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/confessions`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) notFound();

  const weekStart = startOfDay();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());

  const [confessions, myPost] = await Promise.all([
    prisma.confessionPost.findMany({
      where: { groupId: id, weekStart },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { upvotes: true } },
        upvotes: { where: { userId: user.id }, select: { id: true } },
      },
    }),
    prisma.confessionPost.findUnique({
      where: { userId_groupId_weekStart: { userId: user.id, groupId: id, weekStart } },
      select: { id: true },
    }),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <MessageSquareDashed className="w-8 h-8 text-violet-400" /> Confession Box
        </h1>
        <p className="text-zinc-400">
          One anonymous message per member per week. Others can upvote. The leader sees all.
        </p>
      </div>

      <GroupNav groupId={id} active="confessions" />

      <ConfessionsClient
        groupId={id}
        isAdmin={membership.role === "admin"}
        currentUserId={user.id}
        hasPostedThisWeek={Boolean(myPost)}
        confessions={confessions.map((c) => ({
          id: c.id,
          content: c.content,
          createdAt: c.createdAt,
          upvoteCount: c._count.upvotes,
          hasUpvoted: c.upvotes.length > 0,
          isOwn: c.userId === user.id,
        }))}
      />
    </div>
  );
}
