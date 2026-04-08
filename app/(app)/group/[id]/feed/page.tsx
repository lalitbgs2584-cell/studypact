import { Trophy, Users } from "lucide-react";
import { notFound } from "next/navigation";
import { CheckinCard } from "@/components/shared/checkin-card";
import { CheckinForm } from "@/components/shared/checkin-form";
import { GroupChatPanel } from "@/components/shared/group-chat-panel";
import { GroupNav } from "@/components/shared/group-nav";
import { prisma } from "@/lib/db";
import { formatDayKey, startOfDay } from "@/lib/studypact";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";

type FeedPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ board?: string }>;
};

export default async function GroupFeedPage({ params, searchParams }: FeedPageProps) {
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const board = resolvedSearchParams?.board === "early" ? "early" : "points";
  const user = await requireSessionUser(`/group/${id}/feed`);

  if (!(await getGroupMembership(user.id, id))) {
    notFound();
  }

  const today = startOfDay();

  const group = await prisma.group.findUnique({
    where: {
      id,
    },
    include: {
      users: {
        include: {
          user: true,
        },
      },
      checkIns: {
        include: {
          user: true,
          tasks: true,
          verifications: true,
          startFiles: {
            orderBy: { uploadedAt: "desc" },
          },
          endFiles: {
            orderBy: { uploadedAt: "desc" },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 12,
      },
      messages: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      },
      penaltyEvents: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 10,
      },
      startFiles: {
        include: {
          user: true,
        },
        orderBy: {
          uploadedAt: "desc",
        },
        take: 10,
      },
      endFiles: {
        include: {
          user: true,
        },
        orderBy: {
          uploadedAt: "desc",
        },
        take: 10,
      },
    },
  });

  if (!group) {
    notFound();
  }

  const todayCheckIns = await prisma.checkIn.findMany({
    where: {
      groupId: id,
      day: today,
    },
    include: {
      user: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const todayCheckInByUserId = new Map(todayCheckIns.map((checkIn) => [checkIn.userId, checkIn]));
  const leaderboardMembers = [...group.users].sort((left, right) => {
    if (board === "early") {
      const leftCheckIn = todayCheckInByUserId.get(left.userId);
      const rightCheckIn = todayCheckInByUserId.get(right.userId);

      if (leftCheckIn && rightCheckIn) {
        const byTime = leftCheckIn.createdAt.getTime() - rightCheckIn.createdAt.getTime();
        if (byTime !== 0) {
          return byTime;
        }
        return right.streak - left.streak;
      }

      if (leftCheckIn) return -1;
      if (rightCheckIn) return 1;

      if (right.streak !== left.streak) {
        return right.streak - left.streak;
      }

      return right.points - left.points;
    }

    if (right.points !== left.points) {
      return right.points - left.points;
    }

    if (right.reputationScore !== left.reputationScore) {
      return right.reputationScore - left.reputationScore;
    }

    return right.streak - left.streak;
  });

  const recentActivity = [
    ...group.users.map((member) => ({
      id: `join-${member.userId}-${member.joinedAt.toISOString()}`,
      title: `${member.user.name} joined the group`,
      detail: `${member.role || "member"} joined the pact`,
      timestamp: member.joinedAt,
    })),
    ...group.checkIns.map((checkIn) => ({
      id: `checkin-${checkIn.id}`,
      title: `${checkIn.user.name} submitted a check-in`,
      detail: checkIn.status === "PENDING" ? "Waiting for peer review" : `Status: ${checkIn.status.toLowerCase()}`,
      timestamp: checkIn.createdAt,
    })),
    ...group.penaltyEvents.map((penalty) => ({
      id: `penalty-${penalty.id}`,
      title: `${penalty.user.name} was penalized`,
      detail: `-${penalty.points} pts | ${penalty.reason}`,
      timestamp: penalty.createdAt,
    })),
    ...group.startFiles.map((file) => ({
      id: `start-${file.id}`,
      title: `${file.user.name} uploaded a start proof`,
      detail: file.name,
      timestamp: file.uploadedAt,
    })),
    ...group.endFiles.map((file) => ({
      id: `end-${file.id}`,
      title: `${file.user.name} uploaded an end proof`,
      detail: file.name,
      timestamp: file.uploadedAt,
    })),
  ]
    .sort((left, right) => right.timestamp.getTime() - left.timestamp.getTime())
    .slice(0, 12);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      <div className="flex items-center gap-4 border-b border-zinc-800/80 pb-6">
        <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
          <Users className="w-8 h-8 text-indigo-400" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">{group.name}</h1>
          <p className="text-zinc-400">{group.description || "See what your peers are working on today."}</p>
        </div>
      </div>

      <GroupNav groupId={id} active="feed" />

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          {group.checkIns.length > 0 ? (
            group.checkIns.map((checkIn) => (
              <CheckinCard
                key={checkIn.id}
                checkInId={checkIn.id}
                user={checkIn.user.name}
                time={formatDayKey(checkIn.day)}
                status={checkIn.status}
                reflection={checkIn.reflection || "Submitted work proof for today."}
                proofText={checkIn.proofText}
                tasks={checkIn.tasks.map((task) => task.title)}
                startUrl={checkIn.startFiles[0]?.url}
                endUrl={checkIn.endFiles[0]?.url}
                canReview={checkIn.userId !== user.id}
              />
            ))
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-black/20 px-6 py-12 text-center text-zinc-400">
              No submissions yet. Be the first one to post today&apos;s proof.
            </div>
          )}
        </div>

        <div className="lg:col-span-1 sticky top-6 space-y-6">
          <GroupChatPanel
            groupId={id}
            messages={group.messages.map((message) => ({
              id: message.id,
              content: message.content,
              createdAt: message.createdAt,
              userName: message.user.name,
            }))}
          />

          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <Trophy className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-zinc-100">Leaderboard</h3>
                <p className="text-xs text-zinc-500">
                  {board === "early" ? "Today's fastest submissions ranked with streak context" : "Points, streak, and reputation"}
                </p>
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              <a
                href={`/group/${id}/feed?board=points`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${board === "points" ? "bg-primary text-primary-foreground" : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}
              >
                Points Board
              </a>
              <a
                href={`/group/${id}/feed?board=early`}
                className={`rounded-full px-3 py-1 text-xs font-medium ${board === "early" ? "bg-primary text-primary-foreground" : "bg-zinc-900 text-zinc-400 hover:text-zinc-100"}`}
              >
                Early Finishers
              </a>
            </div>

            <div className="space-y-3">
              {leaderboardMembers.slice(0, 5).map((member, index) => {
                const finish = todayCheckInByUserId.get(member.userId);

                return (
                  <div key={member.userId} className="flex items-center justify-between rounded-xl border border-zinc-800 bg-zinc-900/40 px-3 py-3">
                    <div>
                      <p className="text-sm font-medium text-white">{index + 1}. {member.user.name}</p>
                      {board === "early" ? (
                        <p className="text-xs text-zinc-500">
                          {finish ? `Submitted ${finish.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}` : "No submission yet"} | {member.streak} streak
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500">
                          {member.completions} completions | {member.misses} misses | {member.reputationScore} rep
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      {board === "early" ? (
                        <>
                          <p className="text-sm font-semibold text-primary">{finish ? `#${index + 1} today` : "Pending"}</p>
                          <p className="text-xs text-zinc-500">{member.points} pts | {member.reputationScore} rep</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm font-semibold text-primary">{member.points} pts</p>
                          <p className="text-xs text-zinc-500">{member.streak} streak</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
            <h3 className="text-lg font-semibold text-zinc-100 mb-4">Recent Activity</h3>
            {recentActivity.length ? (
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-3">
                    <p className="text-sm font-medium text-zinc-100">{activity.title}</p>
                    <p className="mt-1 text-xs text-zinc-400">{activity.detail}</p>
                    <p className="mt-2 text-xs text-zinc-500">{activity.timestamp.toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
                Activity will appear here as members join, upload proof, and get reviewed.
              </div>
            )}
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-zinc-200 mb-2">Today&apos;s Check-in</h3>
            <p className="text-sm text-zinc-500 mb-4">Don&apos;t forget to submit your proof before midnight.</p>
            <CheckinForm groupId={id} />
          </div>
        </div>
      </div>
    </div>
  );
}
