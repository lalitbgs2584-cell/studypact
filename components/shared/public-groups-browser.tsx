"use client";

import { useDeferredValue, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe, Loader2, Search, Users } from "lucide-react";
import { joinPublicGroupAction } from "@/lib/actions/studypact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getGroupFocusLabel,
  getPenaltyModeLabel,
  getTaskPostingModeLabel,
} from "@/lib/studypact";

type PublicGroup = {
  id: string;
  name: string;
  description: string | null;
  link: string | null;
  dailyPenalty: number;
  maxMembers: number;
  memberCount: number;
  createdByName: string;
  focusType: string;
  taskPostingMode: string;
  penaltyMode: string;
  isMember: boolean;
};

export function PublicGroupsBrowser({ groups }: { groups: PublicGroup[] }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [joiningGroupId, setJoiningGroupId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);

  const filteredGroups = groups.filter((group) => {
    const haystack = `${group.name} ${group.description || ""} ${group.createdByName}`.toLowerCase();
    return haystack.includes(deferredQuery.trim().toLowerCase());
  });

  const handleJoin = (groupId: string) => {
    setError(null);
    setJoiningGroupId(groupId);

    startTransition(async () => {
      const result = await joinPublicGroupAction(groupId);

      if (!result.success || !result.groupId) {
        setError(result.error || "Could not join this public group");
        setJoiningGroupId(null);
        return;
      }

      router.push(`/group/${result.groupId}/feed`);
    });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-zinc-800/70 bg-zinc-950/40 p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-zinc-100">Search public groups</h2>
            <p className="text-sm text-zinc-500">Find open accountability circles by keyword.</p>
          </div>
        </div>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by group name, topic, or creator"
          className="bg-zinc-900 border-zinc-800 text-zinc-100"
        />
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>

      {filteredGroups.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredGroups.map((group) => {
            const isJoining = isPending && joiningGroupId === group.id;
            return (
              <div key={group.id} className="rounded-2xl border border-zinc-800/70 bg-black/20 p-5 space-y-4 backdrop-blur-lg">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
                      <Globe className="w-3.5 h-3.5" />
                      Public Group
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs">
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
                        {getGroupFocusLabel(group.focusType)}
                      </span>
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
                        {getPenaltyModeLabel(group.penaltyMode)}
                      </span>
                    </div>
                    <h3 className="mt-3 text-xl font-semibold text-white">{group.name}</h3>
                    <p className="mt-2 text-sm text-zinc-400">
                      {group.description || "An open accountability circle ready for new members."}
                    </p>
                  </div>
                  <div className="text-right text-sm text-zinc-500">
                    <p>by {group.createdByName}</p>
                    <p>{group.dailyPenalty} pts daily penalty</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 text-sm text-zinc-400">
                  <span className="inline-flex items-center gap-2">
                    <Users className="w-4 h-4 text-zinc-500" />
                    {group.memberCount}/{group.maxMembers} members
                  </span>
                  <span>{getTaskPostingModeLabel(group.taskPostingMode)}</span>
                  {group.link ? (
                    <a href={group.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                      Reference link
                    </a>
                  ) : null}
                </div>

                <div className="flex items-center justify-end">
                  {group.isMember ? (
                    <Button variant="outline" onClick={() => router.push(`/group/${group.id}/feed`)}>
                      Open Group
                    </Button>
                  ) : (
                    <Button onClick={() => handleJoin(group.id)} disabled={isJoining}>
                      {isJoining ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Join Public Group
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-14 text-center text-zinc-500">
          No public groups matched your search yet.
        </div>
      )}
    </div>
  );
}
