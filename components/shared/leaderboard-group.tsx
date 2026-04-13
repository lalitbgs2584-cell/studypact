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

  const topScore = rankedMembers[0]?.score ?? 0;

  return (
    <section className="space-y-5 rounded-2xl border border-border bg-card/50 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{group.name}</h2>
          <p className="text-sm text-muted-foreground">{group.members.length} members</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-border bg-muted/30 p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex-1 rounded-lg px-3 py-1.5 text-center text-xs font-medium transition-colors",
                activeTab === tab.key
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
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
        <div className="space-y-2">
          {rankedMembers.map((member) => {
            const isMe = member.userId === currentUserId;
            const percentage = topScore > 0 ? Math.max(4, Math.round((member.score / topScore) * 100)) : 0;

            return (
              <div
                key={member.userId}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-4 py-3 transition-colors",
                  isMe
                    ? "border-primary/30 bg-primary/8"
                    : "border-border bg-card/40 hover:bg-card/70",
                )}
              >
                <span className="w-8 shrink-0 text-center text-sm">
                  {member.rank <= 3 ? (
                    medalByRank[member.rank]
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">{member.rank}</span>
                  )}
                </span>

                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                  {getInitials(member.name)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {member.name}
                    {isMe ? " (you)" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {member.streak} streak · {member.completions} done · {member.misses} miss
                  </p>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/40">
                    <div
                      className="h-full rounded-full bg-primary/60 transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-foreground">
                    {activeTab === "allTime"
                      ? `${member.score}p`
                      : activeTab === "weekly"
                        ? `${member.score}✓`
                        : `${member.score}d`}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{member.reputationScore}rep</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
