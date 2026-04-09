import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

  const totalUploads = groups.reduce((sum, group) => sum + group._count.startFiles + group._count.endFiles, 0);
  const totalChats = groups.reduce((sum, group) => sum + group._count.messages, 0);
  const totalUsers = groups.reduce((all, group) => {
    group.users.forEach((membership) => all.add(membership.userId));
    return all;
  }, new Set<string>()).size;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Platform Admin Dashboard</h1>
        <p className="text-zinc-400">
          Moderate disputes, rotate leaked invites, and manage users across the whole StudyPact platform.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Total Groups</p>
          <p className="mt-2 text-3xl font-bold text-white">{groups.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Moderation Queue</p>
          <p className="mt-2 text-3xl font-bold text-white">{moderationQueue.length}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Total Chats</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalChats}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Total Uploads</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalUploads}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5">
          <p className="text-xs uppercase tracking-wider text-zinc-500">Visible Users</p>
          <p className="mt-2 text-3xl font-bold text-white">{totalUsers}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <section className="rounded-2xl border border-zinc-800/60 bg-black/20 p-6">
            <div className="flex items-center justify-between gap-4 mb-5">
              <div>
                <h2 className="text-xl font-semibold text-zinc-100">Moderation Queue</h2>
                <p className="text-sm text-zinc-500">Pending check-ins with active reviewer votes.</p>
              </div>
            </div>

            {moderationQueue.length ? (
              <div className="space-y-4">
                {moderationQueue.map((checkIn) => {
                  const approvals = checkIn.verifications.filter((vote) => vote.verdict === "APPROVE");
                  const flags = checkIn.verifications.filter((vote) => vote.verdict === "FLAG");

                  return (
                    <div key={checkIn.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-sm text-zinc-500">{checkIn.group.name}</p>
                          <h3 className="text-lg font-semibold text-white">{checkIn.user.name}</h3>
                          <p className="mt-1 text-sm text-zinc-400">
                            Submitted {checkIn.createdAt.toLocaleString("en-IN")}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-300">
                            {approvals.length} approve
                          </Badge>
                          <Badge variant="secondary" className="bg-amber-500/10 text-amber-300">
                            {flags.length} flag
                          </Badge>
                        </div>
                      </div>

                      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-4">
                        <p className="text-sm text-zinc-300">{checkIn.proofText || checkIn.reflection || "No extra notes provided."}</p>
                        <div className="mt-3 flex flex-wrap gap-2 text-xs text-zinc-500">
                          {checkIn.verifications.map((vote) => (
                            <span key={vote.id}>
                              {vote.reviewer.name}: {vote.verdict.toLowerCase()}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-wrap justify-end gap-2">
                        <form action={adminResolveCheckInAction.bind(null, { checkInId: checkIn.id, verdict: "FLAG" })}>
                          <Button type="submit" variant="outline" className="border-amber-500/30 text-amber-300">
                            Finalize as Flagged
                          </Button>
                        </form>
                        <form action={adminResolveCheckInAction.bind(null, { checkInId: checkIn.id, verdict: "APPROVE" })}>
                          <Button type="submit">
                            Approve Submission
                          </Button>
                        </form>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 px-6 py-12 text-center text-zinc-500">
                No check-ins are waiting for manual moderation right now.
              </div>
            )}
          </section>

          <section className="space-y-6">
            <h2 className="text-xl font-semibold text-zinc-100">All Groups</h2>
            {groups.map((group) => (
              <div key={group.id} className="rounded-2xl border border-zinc-800/60 bg-black/20 p-6 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap gap-2 mb-2">
                      <Badge variant="secondary" className="bg-indigo-500/10 text-indigo-300">
                        Creator {group.createdBy.name}
                      </Badge>
                      <Badge variant="secondary" className={group.visibility === "PUBLIC" ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-300"}>
                        {group.visibility.toLowerCase()}
                      </Badge>
                    </div>
                    <h3 className="text-2xl font-bold text-white">{group.name}</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {group.description || "No description"} | {group._count.messages} chats | {group._count.checkIns} check-ins | {group._count.startFiles + group._count.endFiles} uploads
                    </p>
                  </div>

                  <form action={rotateGroupInviteCodeAction.bind(null, group.id)}>
                    <Button type="submit" variant="outline">
                      Rotate Invite
                    </Button>
                  </form>
                </div>

                <div className="grid gap-3 md:grid-cols-3 text-sm">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
                    <p className="text-zinc-500">Invite Code</p>
                    <p className="mt-1 font-mono text-white">{group.inviteCode}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
                    <p className="text-zinc-500">Invite Expires</p>
                    <p className="mt-1 text-white">{group.inviteExpiresAt.toLocaleString("en-IN")}</p>
                  </div>
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
                    <p className="text-zinc-500">Members</p>
                    <p className="mt-1 text-white">{group._count.users}/{group.maxMembers}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4">
                  <p className="text-sm font-medium text-white mb-3">Members</p>
                  <div className="space-y-2">
                    {group.users.map((membership) => (
                      <div key={membership.userId} className="flex items-center justify-between text-sm text-zinc-300">
                        <span>{membership.user.name} ({membership.user.email})</span>
                        <span className="text-zinc-500">{membership.role || "member"} | {membership.points} pts</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </section>
        </div>

        <div className="space-y-8">
          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">Recent Group Chats</h2>
            <div className="space-y-3 max-h-[28rem] overflow-y-auto">
              {messages.map((message) => (
                <div key={message.id} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
                  <p className="text-sm text-white">{message.content || "Shared a photo with the group."}</p>
                  {message.imageUrl ? (
                    <img
                      src={message.imageUrl}
                      alt={message.imageName || "Group post image"}
                      className="mt-3 max-h-40 w-full rounded-lg border border-zinc-800 object-cover"
                    />
                  ) : null}
                  <p className="mt-2 text-xs text-zinc-500">{message.user.name} | {message.group.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-6">
            <h2 className="text-xl font-semibold text-zinc-100 mb-4">User Management</h2>
            <div className="space-y-3">
              {users.map((user) => (
                <div key={user.id} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm text-white">{user.name}</p>
                      <p className="text-xs text-zinc-500">{user.email} | role {user.role || "member"}</p>
                    </div>
                    <form action={setUserBlockedStatusAction.bind(null, { userId: user.id, isBlocked: !Boolean(user.isBlocked) })}>
                      <Button type="submit" variant={user.isBlocked ? "outline" : "destructive"} size="sm">
                        {user.isBlocked ? "Unblock" : "Block"}
                      </Button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
