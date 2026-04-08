import Link from "next/link";
import { Compass, Plus } from "lucide-react";
import { PublicGroupsBrowser } from "@/components/shared/public-groups-browser";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/studypact";

export default async function DiscoverGroupsPage() {
  const user = await requireSessionUser("/groups/discover");

  const [groups, memberships] = await Promise.all([
    prisma.group.findMany({
      where: {
        visibility: "PUBLIC",
      },
      include: {
        createdBy: true,
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.userGroup.findMany({
      where: {
        userId: user.id,
      },
      select: {
        groupId: true,
      },
    }),
  ]);

  const membershipIds = new Set(memberships.map((membership) => membership.groupId));

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Compass className="w-8 h-8 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Discover Public Groups</h1>
            <p className="text-zinc-400">Browse searchable accountability circles and join one-click public pacts.</p>
          </div>
        </div>

        <Link href="/groups/create">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create New Group
          </Button>
        </Link>
      </div>

      <PublicGroupsBrowser
        groups={groups.map((group) => ({
          id: group.id,
          name: group.name,
          description: group.description,
          link: group.link,
          dailyPenalty: group.dailyPenalty,
          maxMembers: group.maxMembers,
          memberCount: group._count.users,
          createdByName: group.createdBy.name,
          isMember: membershipIds.has(group.id),
        }))}
      />
    </div>
  );
}
