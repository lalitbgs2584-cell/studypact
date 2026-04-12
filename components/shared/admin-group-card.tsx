import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ArrowUpRight, Camera, Flame } from "lucide-react";
import Link from "next/link";
import { getGroupFocusLabel } from "@/lib/studypact";

type AdminGroupCardProps = {
  id?: string;
  badge?: string;
  title?: string;
  description?: string | null;
  memberCount?: number;
  role?: string | null;
  focusType?: string | null;
  points?: number;
  streak?: number;
  completionRate?: number;
  submittedToday?: boolean;
  todayStatus?: string | null;
};

export function AdminGroupCard({
  id = "1",
  badge = "Enrolled Group",
  title = "Study Group",
  description,
  memberCount = 0,
  role = "member",
  focusType = "GENERAL",
  points = 0,
  streak = 0,
  completionRate = 0,
  submittedToday = false,
  todayStatus,
}: AdminGroupCardProps) {
  const isAdmin = role === "admin";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-black/50 backdrop-blur-xl overflow-hidden flex flex-col">
      {/* Top accent */}
      <div className={`h-1 w-full ${isAdmin ? "bg-gradient-to-r from-primary to-indigo-500" : "bg-gradient-to-r from-zinc-700 to-zinc-600"}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5">
              <Badge className={`text-xs ${isAdmin ? "bg-primary/10 text-primary border-primary/20" : "bg-zinc-800 text-zinc-400 border-zinc-700"}`}>
                {badge}
              </Badge>
              <span className="text-xs text-zinc-600 border border-zinc-800 rounded-full px-2 py-0.5">
                {getGroupFocusLabel(focusType || "GENERAL")}
              </span>
            </div>
            <h3 className="text-lg font-bold text-white truncate">{title}</h3>
            {description && (
              <p className="text-xs text-zinc-500 mt-0.5 line-clamp-1">{description}</p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-3 py-2.5 text-center">
            <p className="text-xs text-zinc-500 mb-1">Points</p>
            <p className="text-lg font-bold text-white">{points}</p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-3 py-2.5 text-center">
            <p className="text-xs text-zinc-500 mb-1">Streak</p>
            <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />{streak}
            </p>
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-3 py-2.5 text-center">
            <p className="text-xs text-zinc-500 mb-1">Members</p>
            <p className="text-lg font-bold text-white flex items-center justify-center gap-1">
              <Users className="w-3.5 h-3.5 text-zinc-400" />{memberCount}
            </p>
          </div>
        </div>

        {/* Today's status */}
        <div className={`rounded-xl border px-4 py-2.5 text-sm flex items-center justify-between ${
          submittedToday
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            : "border-amber-500/20 bg-amber-500/5 text-amber-300"
        }`}>
          <span>
            {submittedToday
              ? todayStatus === "APPROVED" ? "✓ Approved today" : "✓ Submitted — pending review"
              : "⚠ Proof not submitted yet"}
          </span>
          <span className="text-xs opacity-60">{completionRate}% overall</span>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2 mt-auto">
          <Link href={`/group/${id}/feed`}>
            <Button variant="outline" className="w-full border-zinc-700 text-zinc-300 hover:text-white gap-1.5 text-sm">
              Feed <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </Link>
          <Link href={`/group/${id}/checkin`}>
            <Button className="w-full gap-1.5 text-sm bg-primary hover:bg-primary/90">
              <Camera className="w-3.5 h-3.5" />
              {submittedToday ? "Resubmit" : "Upload Proof"}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
