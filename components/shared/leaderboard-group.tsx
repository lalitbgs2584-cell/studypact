"use client";

import { useMemo, useState } from "react";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

type LeaderboardTab = "daily" | "weekly" | "allTime";

type LeaderboardGroupProps = {
  group: {
    id: string;
    name: string;
    members: {
      userId: string;
      name: string;
      points: number;
      streak: number;
      completions: number;
      misses: number;
      reputationScore: number;
    }[];
    checkIns: {
      userId: string;
      status: string;
      createdAt: string;
      day: string;
    }[];
  };
  currentUserId: string;
  todayIso: string;
};

const tabs: { key: LeaderboardTab; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "weekly", label: "Weekly" },
  { key: "allTime", label: "All-Time" },
];

const medalByRank: Record<number, string> = {
  1: "\u{1F947}",
  2: "\u{1F948}",
  3: "\u{1F949}",
};

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function LeaderboardGroup({ group, currentUserId, todayIso }: LeaderboardGroupProps) {
  const [activeTab, setActiveTab] = useState<LeaderboardTab>("allTime");

  const rankedMembers = useMemo(() => {
    const todayKey = new Date(todayIso).toISOString().slice(0, 10);
    const todayCheckIns = new Map(
      group.checkIns
        .filter((checkIn) => new Date(checkIn.day).toISOString().slice(0, 10) === todayKey)
        .map((checkIn) => [checkIn.userId, new Date(checkIn.createdAt)]),
    );

    const weeklyApproved = new Map<string, number>();
    for (const checkIn of group.checkIns) {
      if (checkIn.status === "APPROVED") {
        weeklyApproved.set(checkIn.userId, (weeklyApproved.get(checkIn.userId) ?? 0) + 1);
      }
    }

    const members = group.members.map((member) => ({
      ...member,
      dailySubmissionTime: todayCheckIns.get(member.userId) ?? null,
      weeklyApproved: weeklyApproved.get(member.userId) ?? 0,
    }));

    const sorted = [...members].sort((left, right) => {
      if (activeTab === "daily") {
        if (left.dailySubmissionTime && right.dailySubmissionTime) {
          return left.dailySubmissionTime.getTime() - right.dailySubmissionTime.getTime();
        }
        if (left.dailySubmissionTime) return -1;
        if (right.dailySubmissionTime) return 1;
        return right.streak - left.streak;
      }

      if (activeTab === "weekly") {
        const diff = right.weeklyApproved - left.weeklyApproved;
        return diff !== 0 ? diff : right.points - left.points;
      }

      return right.points !== left.points ? right.points - left.points : right.streak - left.streak;
    });

    return sorted.map((member, index) => {
      const score =
        activeTab === "daily"
          ? member.streak
          : activeTab === "weekly"
            ? member.weeklyApproved
            : member.points;

      return {
        ...member,
        rank: index + 1,
        score,
      };
    });
  }, [activeTab, group.checkIns, group.members, todayIso]);

  const rest = rankedMembers.slice(3);
  const topScore = rankedMembers[0]?.score ?? 0;

  return (
    <section className="space-y-5 rounded-[2rem] border border-border bg-background/60 p-6 backdrop-blur-xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{group.name}</h2>
          <p className="text-sm text-muted-foreground">{group.members.length} members</p>
        </div>
        <div className="flex flex-wrap gap-2 rounded-full border border-border bg-card/70 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {group.members.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-16 text-center">
          <Trophy className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <p className="text-lg font-semibold text-foreground">No members yet.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-3 lg:items-end">
            {[rankedMembers[1], rankedMembers[0], rankedMembers[2]].map((member, index) => {
              if (!member) return <div key={`empty-${index}`} className="hidden lg:block" />;

              const isFirst = member.rank === 1;
              const badgeTone =
                member.rank === 1
                  ? "from-primary to-emerald-300"
                  : member.rank === 2
                    ? "from-zinc-300 to-zinc-500"
                    : "from-amber-300 to-amber-600";

              return (
                <div
                  key={member.userId}
                  className={cn(
                    "rounded-3xl border border-border bg-card/80 p-5 text-center shadow-xl",
                    isFirst ? "lg:min-h-[18rem]" : "lg:min-h-[15rem]",
                    member.userId === currentUserId && "ring-1 ring-primary/40",
                  )}
                >
                  <div
                    className={cn(
                      "mx-auto flex items-center justify-center rounded-full bg-gradient-to-br text-lg font-bold text-background shadow-lg",
                      isFirst ? "h-20 w-20" : "h-16 w-16",
                      badgeTone,
                    )}
                  >
                    {getInitials(member.name)}
                  </div>
                  <p className="mt-4 text-2xl">{medalByRank[member.rank]}</p>
                  <p className="mt-2 truncate text-lg font-semibold text-foreground">
                    {member.name}
                    {member.userId === currentUserId ? " (you)" : ""}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {activeTab === "allTime"
                      ? `${member.score} pts`
                      : activeTab === "weekly"
                        ? `${member.score} completions`
                        : `${member.score} streak`}
                  </p>
                </div>
              );
            })}
          </div>

          <div className="space-y-3">
            {rest.map((member, index) => {
              const percentage = topScore > 0 ? Math.max(6, Math.round((member.score / topScore) * 100)) : 0;
              return (
                <div
                  key={member.userId}
                  className={cn(
                    "rounded-2xl border border-border p-4",
                    index % 2 === 0 ? "bg-card/70" : "bg-card/40",
                    member.userId === currentUserId && "ring-1 ring-primary/35",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 text-sm font-bold text-muted-foreground">{member.rank}</span>
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                      {getInitials(member.name)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {member.name}
                        {member.userId === currentUserId ? " (you)" : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm font-semibold text-foreground">
                      {activeTab === "allTime"
                        ? `${member.score} pts`
                        : activeTab === "weekly"
                          ? `${member.score} completed`
                          : `${member.score} streak`}
                    </div>
                  </div>

                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                      {member.streak} streak
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                      {member.completions} completions
                    </span>
                    <span className="rounded-full border border-border bg-background px-2.5 py-1 text-muted-foreground">
                      {member.misses} misses
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
