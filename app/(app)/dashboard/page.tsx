import Link from "next/link";
import { Compass, Plus } from "lucide-react";
import { AdminGroupCard } from "@/components/shared/admin-group-card";
import { JoinGroupDialog } from "@/components/shared/join-group-dialog";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/db";
import { requireSessionUser } from "@/lib/server/studypact";
import { calculateCompletionRate } from "@/lib/studypact";

export default async function DashboardPage() {
  const user = await requireSessionUser("/dashboard");

  const [memberships, publicGroupCount] = await Promise.all([
    prisma.userGroup.findMany({
      where: {
        userId: user.id,
      },
      orderBy: {
        joinedAt: "desc",
      },
      include: {
        group: {
          include: {
            _count: {
              select: {
                users: true,
                startFiles: true,
                endFiles: true,
              },
            },
          },
        },
      },
    }),
    prisma.group.count({
      where: {
        visibility: "PUBLIC",
      },
    }),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">My Study Groups</h1>
          <p className="text-zinc-400">Keep track of your commitments, invite links, and reputation across active pacts.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <JoinGroupDialog />
          <Link href="/groups/discover">
            <Button variant="outline" className="gap-2 border-zinc-700 text-zinc-100">
              <Compass className="w-4 h-4" /> Discover Public Groups
            </Button>
          </Link>
          <Link href="/groups/create">
            <Button className="bg-primary hover:bg-primary/90 gap-2 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              <Plus className="w-4 h-4" /> Create Group
            </Button>
          </Link>
        </div>
      </div>

      {publicGroupCount > 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100">
          {publicGroupCount} public {publicGroupCount === 1 ? "group is" : "groups are"} available to browse right now from the discover page.
        </div>
      ) : null}

      {memberships.length > 0 ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {memberships.map((membership) => (
            <AdminGroupCard
              key={membership.groupId}
              id={membership.group.id}
              badge={membership.role === "admin" ? "Group You Manage" : "Enrolled Group"}
              title={membership.group.name}
              description={`${membership.group.description || "Closed accountability circle"} • ${calculateCompletionRate(membership.completions, membership.misses)}% completion • ${membership.points} pts • ${membership.streak} streak • ${membership.reputationScore} rep`}
              memberCount={membership.group._count.users}
              fileCount={membership.group._count.startFiles + membership.group._count.endFiles}
              role={membership.role}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-10 text-center backdrop-blur-lg">
          <h2 className="text-2xl font-semibold text-white">No study groups yet</h2>
          <p className="mt-2 text-zinc-400">
            Create a new pact or open an invite link to join one. Your groups will appear here once you&apos;re in.
          </p>
        </div>
      )}
    </div>
  );
}
