import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verifyCheckInAction } from "@/lib/actions/studypact";
import { CheckCircle2, ExternalLink, Flag, ShieldAlert, Sparkles, Check } from "lucide-react";

interface CheckinCardProps {
  checkInId: string;
  user: string;
  reflection: string;
  proofText?: string | null;
  status: "PENDING" | "APPROVED" | "FLAGGED" | "REJECTED";
  time: string;
  tasks: string[];
  startUrl?: string | null;
  endUrl?: string | null;
  canReview?: boolean;
}

export function CheckinCard({
  checkInId,
  user,
  reflection,
  proofText,
  status,
  time,
  tasks,
  startUrl,
  endUrl,
  canReview = false,
}: CheckinCardProps) {
  return (
    <Card className="bg-black/40 border-zinc-800/50 backdrop-blur-xl hover:border-zinc-700 transition-all group overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between pb-2 border-b border-zinc-800/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center border border-zinc-800/50">
              <span className="text-sm font-bold text-zinc-300">{user.charAt(0)}</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-base text-zinc-100">{user}</CardTitle>
            <CardDescription className="text-xs text-zinc-500">{time}</CardDescription>
          </div>
        </div>
        {status === "APPROVED" && <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"><CheckCircle2 className="w-3 h-3 mr-1" /> Verified</Badge>}
        {status === "PENDING" && <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">Pending Review</Badge>}
        {status === "FLAGGED" && <Badge variant="destructive" className="bg-amber-500/10 text-amber-400 border-amber-500/20"><Flag className="w-3 h-3 mr-1" /> Flagged</Badge>}
        {status === "REJECTED" && <Badge variant="destructive" className="bg-red-500/10 text-red-500 border-red-500/20"><ShieldAlert className="w-3 h-3 mr-1" /> Rejected</Badge>}
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden relative aspect-video bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-center p-4">
            <Sparkles className="w-8 h-8 text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-200">Start Pic</p>
            {startUrl ? (
              <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={startUrl} target="_blank" rel="noreferrer">
                Open proof <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Not uploaded</p>
            )}
          </div>
          <div className="rounded-xl overflow-hidden relative aspect-video bg-zinc-900 border border-zinc-800 flex flex-col items-center justify-center text-center p-4">
            <Sparkles className="w-8 h-8 text-zinc-700" />
            <p className="mt-3 text-sm font-medium text-zinc-200">End Pic</p>
            {endUrl ? (
              <a className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline" href={endUrl} target="_blank" rel="noreferrer">
                Open proof <ExternalLink className="w-3 h-3" />
              </a>
            ) : (
              <p className="mt-2 text-xs text-zinc-500">Not uploaded</p>
            )}
          </div>
        </div>

        {tasks.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {tasks.map((task) => (
              <Badge key={task} variant="secondary" className="bg-zinc-900 text-zinc-300 border-zinc-800">
                {task}
              </Badge>
            ))}
          </div>
        ) : null}

        {proofText ? (
          <p className="text-sm text-zinc-400 border border-zinc-800 rounded-xl px-3 py-2 bg-zinc-900/30">
            {proofText}
          </p>
        ) : null}

        <p className="text-sm text-zinc-300 leading-relaxed border-l-2 border-primary/50 pl-3 italic">
          &quot;{reflection}&quot;
        </p>
      </CardContent>
      {canReview && status === "PENDING" ? (
        <CardFooter className="flex justify-end gap-2 border-t border-zinc-800/20 pt-4 bg-zinc-900/20">
          <form action={verifyCheckInAction.bind(null, { checkInId, verdict: "FLAG" })}>
            <Button type="submit" variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              Flag
            </Button>
          </form>
          <form action={verifyCheckInAction.bind(null, { checkInId, verdict: "APPROVE" })}>
            <Button type="submit" size="sm" className="bg-primary/20 text-primary border border-primary/30 hover:bg-primary hover:text-white transition-all shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
          </form>
        </CardFooter>
      ) : null}
    </Card>
  );
}
