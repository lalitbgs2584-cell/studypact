import { headers } from "next/headers";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminGroupCard } from "@/components/shared/admin-group-card";
import {
  adminResolveCheckInAction,
  requirePlatformAdmin,
  rotateGroupInviteCodeAction,
  setUserBlockedStatusAction,
} from "@/lib/actions/studypact";
import auth from "@/lib/auth/auth";
import { prisma } from "@/lib/db";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "admin") {
    redirect("/dashboard");
  }

  await requirePlatformAdmin();

  const [groups, messages, users, moderationQueue] = await Promise.all([
    prisma.group.findMany({
      include: {
        createdBy: true,
        users: {
          include: {
            user: true,
          },
        },
        _count: {
          select: {
            users: true,
            startFiles: true,
            endFiles: true,
            messages: true,
            checkIns: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.groupMessage.findMany({
      include: {
        user: true,
        group: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
    prisma.user.findMany({
      orderBy: {
        createdAt: "desc",
      },
      take: 25,
    }),
    prisma.checkIn.findMany({
      where: {
        status: "PENDING",
        verifications: {
          some: {},
        },
      },
      include: {
        user: true,
        group: true,
        verifications: {
          include: {
            reviewer: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    }),
  ]);

  return (
    <div className="animate-in space-y-6 fade-in slide-in-from-bottom-8 duration-700">
      <div>
        <h1 className="mb-2 text-3xl font-bold tracking-tight text-foreground">Platform Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Moderate disputes, rotate leaked invites, and manage users across the whole StudyPact platform.
        </p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Total Groups", value: groups.length },
          { label: "Total Users", value: users.length },
          { label: "Pending Queue", value: moderationQueue.length },
          { label: "Messages", value: messages.length },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card/50 p-4">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      <Tabs defaultValue="groups" className="space-y-6">
        <TabsList className="gap-1 rounded-xl border border-border bg-muted/30 p-1">
          <TabsTrigger value="groups" className="rounded-lg text-xs">
            Groups ({groups.length})
          </TabsTrigger>
          <TabsTrigger value="users" className="rounded-lg text-xs">
            Users ({users.length})
          </TabsTrigger>
          <TabsTrigger value="queue" className="rounded-lg text-xs">
            Moderation Queue ({moderationQueue.length})
          </TabsTrigger>
          <TabsTrigger value="messages" className="rounded-lg text-xs">
            Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="groups" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {groups.map((group) => {
              const totalPoints = group.users.reduce((sum, membership) => sum + membership.points, 0);
              const bestStreak = group.users.reduce((best, membership) => Math.max(best, membership.streak), 0);
              const totalCompletions = group.users.reduce((sum, membership) => sum + membership.completions, 0);
              const totalMisses = group.users.reduce((sum, membership) => sum + membership.misses, 0);
              const completionRate =
                totalCompletions + totalMisses > 0
                  ? Math.round((totalCompletions / (totalCompletions + totalMisses)) * 100)
                  : 0;

              return (
                <div key={group.id} className="space-y-3">
                  <AdminGroupCard
                    id={group.id}
                    badge={group.visibility === "PUBLIC" ? "Public Group" : "Private Group"}
                    title={group.name}
                    description={group.description}
                    memberCount={group._count.users}
                    role="admin"
                    focusType={group.focusType}
                    points={totalPoints}
                    streak={bestStreak}
                    completionRate={completionRate}
                    submittedToday={group._count.checkIns > 0}
                    todayStatus={group._count.checkIns > 0 ? "PENDING" : null}
                  />
                  <div className="rounded-2xl border border-border bg-card/40 p-4 text-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">Creator: {group.createdBy.name}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Invite code {group.inviteCode} · Expires {group.inviteExpiresAt.toLocaleString("en-IN")}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {group._count.messages} messages · {group._count.checkIns} check-ins ·{" "}
                          {group._count.startFiles + group._count.endFiles} uploads
                        </p>
                      </div>
                      <form action={rotateGroupInviteCodeAction.bind(null, group.id)}>
                        <Button type="submit" size="sm" variant="outline" className="text-xs">
                          Rotate Invite
                        </Button>
                      </form>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="users">
          <div className="overflow-auto rounded-2xl border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left">Name</th>
                  <th className="px-4 py-3 text-left">Email</th>
                  <th className="px-4 py-3 text-left">Role</th>
                  <th className="px-4 py-3 text-left">Blocked</th>
                  <th className="px-4 py-3 text-left">Joined</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map((user) => (
                  <tr key={user.id} className="bg-card/20">
                    <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{user.email}</td>
                    <td className="px-4 py-3 text-foreground">{user.role || "member"}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant="secondary"
                        className={
                          user.isBlocked
                            ? "bg-rose-500/10 text-rose-400"
                            : "bg-emerald-500/10 text-emerald-400"
                        }
                      >
                        {user.isBlocked ? "Blocked" : "Active"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {user.createdAt.toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3">
                      <form
                        action={setUserBlockedStatusAction.bind(null, {
                          userId: user.id,
                          isBlocked: !Boolean(user.isBlocked),
                        })}
                      >
                        <Button type="submit" size="sm" variant="outline" className="text-xs">
                          {user.isBlocked ? "Unblock" : "Block"}
                        </Button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="queue">
          {moderationQueue.length ? (
            <div className="space-y-3">
              {moderationQueue.map((item) => {
                const approvals = item.verifications.filter((vote) => vote.verdict === "APPROVE");
                const flags = item.verifications.filter((vote) => vote.verdict === "FLAG");

                return (
                  <div key={item.id} className="space-y-2 rounded-2xl border border-border bg-card/50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {item.user.name} — {item.group.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {item.day?.toLocaleDateString("en-IN")} · {item.createdAt.toLocaleString("en-IN")}
                        </p>
                      </div>
                      <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-400">
                        PENDING
                      </span>
                    </div>

                    <div className="rounded-xl border border-border bg-muted/20 p-3">
                      <p className="text-sm text-foreground">
                        {item.proofText || item.reflection || "No extra notes provided."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                        <span>{approvals.length} approve</span>
                        <span>{flags.length} flag</span>
                        {item.verifications.map((vote) => (
                          <span key={vote.id}>
                            {vote.reviewer.name}: {vote.verdict.toLowerCase()}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <form action={adminResolveCheckInAction.bind(null, { checkInId: item.id, verdict: "APPROVE" })}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-emerald-500/30 text-xs text-emerald-400 hover:bg-emerald-500/10"
                        >
                          Approve
                        </Button>
                      </form>
                      <form action={adminResolveCheckInAction.bind(null, { checkInId: item.id, verdict: "FLAG" })}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 border-rose-500/30 text-xs text-rose-400 hover:bg-rose-500/10"
                        >
                          Reject
                        </Button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center text-muted-foreground">
              No check-ins are waiting for manual moderation right now.
            </div>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <div className="space-y-3">
            {messages.map((message) => (
              <div key={message.id} className="rounded-2xl border border-border bg-card/50 p-4">
                <p className="text-sm text-foreground">{message.content || "Shared a photo with the group."}</p>
                {message.imageUrl ? (
                  <Image
                    src={message.imageUrl}
                    alt={message.imageName || "Group post image"}
                    width={640}
                    height={240}
                    className="mt-3 max-h-40 w-full rounded-lg border border-border object-cover"
                  />
                ) : null}
                <p className="mt-2 text-xs text-muted-foreground">
                  {message.user.name} · {message.group.name} · {message.createdAt.toLocaleString("en-IN")}
                </p>
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
