import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Settings, Users, ArrowUpRight, Files } from "lucide-react";
import Link from "next/link";
import { getGroupFocusLabel, getPenaltyModeLabel } from "@/lib/studypact";

type AdminGroupCardProps = {
  id?: string;
  badge?: string;
  title?: string;
  description?: string | null;
  memberCount?: number;
  fileCount?: number;
  role?: string | null;
  href?: string;
  focusType?: string | null;
  penaltyMode?: string | null;
};

export function AdminGroupCard({
  id = "1",
  badge = "CS101 Study Group",
  title = "Backend Engineering Bootcampt",
  description = "Manage your shared accountability space.",
  memberCount = 12,
  fileCount = 0,
  role = "admin",
  href,
  focusType = "GENERAL",
  penaltyMode = "BURN",
}: AdminGroupCardProps) {
  const destination = href ?? `/group/${id}/feed`;
  const roleLabel = role ? role[0].toUpperCase() + role.slice(1) : "Member";

  return (
    <Card className="bg-black/60 border-zinc-800 backdrop-blur-xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <CardHeader className="flex flex-row items-start justify-between pb-4">
        <div>
          <Badge className="mb-2 bg-indigo-500/10 text-indigo-400 font-semibold border-indigo-500/20">{badge}</Badge>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
              {getGroupFocusLabel(focusType || "GENERAL")}
            </span>
            <span className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1 text-zinc-300">
              {getPenaltyModeLabel(penaltyMode || "BURN")}
            </span>
          </div>
          <CardTitle className="text-2xl text-white font-bold tracking-tight">{title}</CardTitle>
          <p className="mt-2 text-sm text-zinc-400 max-w-xl">{description || "No description added for this group yet."}</p>
        </div>
        <Button variant="outline" size="icon" className="border-zinc-700 bg-zinc-800/50 text-zinc-300 hover:text-white">
          <Settings className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Members</span>
            <div className="flex items-center gap-2 mt-auto">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-2xl font-bold text-white">{memberCount}</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Your Role</span>
            <div className="flex items-center gap-2 mt-auto">
              <span className="text-2xl font-bold text-emerald-400">{roleLabel}</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex flex-col">
            <span className="text-zinc-500 text-xs font-semibold uppercase tracking-wider mb-1">Shared Files</span>
            <div className="flex items-center gap-2 mt-auto">
              <Files className="w-4 h-4 text-emerald-500/70" />
              <span className="text-2xl font-bold text-emerald-400">{fileCount}</span>
            </div>
          </div>
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-xl p-4 flex items-center justify-center">
            <Link href={destination} className="w-full h-full flex items-center justify-center">
              <Button variant="ghost" className="w-full h-full rounded-lg text-primary hover:text-primary hover:bg-primary/10">
                View Feed <ArrowUpRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
