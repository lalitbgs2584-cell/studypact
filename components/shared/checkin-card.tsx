import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { verifyCheckInAction } from "@/lib/actions/studypact";
import { cn } from "@/lib/utils";
import { CheckCircle2, ExternalLink, Flag, ShieldAlert, Sparkles, Check } from "lucide-react";

interface CheckinCardProps {
  checkInId: string;
  user: string;
  reflection: string;
  proofText?: string | null;
  proofLink?: string | null;
  aiSummary?: string | null;
  aiConfidence?: number | null;
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
  proofLink,
  aiSummary,
  aiConfidence,
  status,
  time,
  tasks,
  startUrl,
  endUrl,
  canReview = false,
}: CheckinCardProps) {
  const proofs = [
    {
      label: "Start Pic",
      helper: "How the work session started.",
      url: startUrl,
    },
    {
      label: "End Pic",
      helper: "The final proof before submission.",
      url: endUrl,
    },
  ];

  return (
    <Card className="overflow-hidden border-zinc-800/60 bg-black/40 backdrop-blur-xl transition-all hover:border-zinc-700">
      <CardHeader className="flex flex-row items-center justify-between border-b border-zinc-800/20 pb-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 p-[2px]">
            <div className="w-full h-full rounded-full border border-zinc-800/50 bg-black flex items-center justify-center">
              <span className="text-sm font-bold text-zinc-300">{user.charAt(0)}</span>
            </div>
          </div>
          <div>
            <CardTitle className="text-base text-zinc-100">{user}</CardTitle>
            <CardDescription className="text-xs text-zinc-500">{time}</CardDescription>
          </div>
        </div>
        {status === "APPROVED" ? (
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Verified
          </Badge>
        ) : null}
        {status === "PENDING" ? (
          <Badge variant="secondary" className="border-zinc-700 bg-zinc-800 text-zinc-300">
            Pending Review
          </Badge>
        ) : null}
        {status === "FLAGGED" ? (
          <Badge variant="destructive" className="border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Flag className="w-3 h-3 mr-1" /> Flagged
          </Badge>
        ) : null}
        {status === "REJECTED" ? (
          <Badge variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-500">
            <ShieldAlert className="w-3 h-3 mr-1" /> Rejected
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {proofs.map((proof) => (
                <div
                  key={proof.label}
                  className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-3">
                      <Sparkles className="w-5 h-5 text-zinc-500" />
                    </div>
                    <Badge
                      variant="secondary"
                      className={proof.url ? "bg-emerald-500/10 text-emerald-300" : "bg-zinc-800 text-zinc-400"}
                    >
                      {proof.url ? "Uploaded" : "Missing"}
                    </Badge>
                  </div>

                  <p className="mt-4 text-sm font-semibold text-zinc-100">{proof.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">{proof.helper}</p>

                  {proof.url ? (
                    <a
                      href={proof.url}
                      target="_blank"
                      rel="noreferrer"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-4 w-full justify-center border-zinc-700 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800",
                      )}
                    >
                      View {proof.label} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ) : (
                    <span
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        "mt-4 w-full justify-center border-zinc-800 bg-zinc-950/60 text-zinc-500",
                      )}
                    >
                      No {proof.label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {tasks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tasks.map((task) => (
                  <Badge key={task} variant="secondary" className="border-zinc-800 bg-zinc-900 text-zinc-300">
                    {task}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/20 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Reflection</p>
              <p className="mt-3 text-sm leading-relaxed text-zinc-300">&quot;{reflection}&quot;</p>
            </div>
          </div>

          <div className="space-y-4">
            {proofText ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">Proof Note</p>
                <p className="mt-3 text-sm text-zinc-300">{proofText}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">External Proof</p>
              {proofLink ? (
                <a
                  href={proofLink}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    buttonVariants({ variant: "outline", size: "sm" }),
                    "mt-3 w-full justify-center border-zinc-700 bg-zinc-900/70 text-zinc-100 hover:bg-zinc-800",
                  )}
                >
                  Open Proof Link <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <p className="mt-3 text-sm text-zinc-500">No extra proof link was attached.</p>
              )}
            </div>

            {aiSummary ? (
              <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-4 text-sm text-indigo-100">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-200/70">
                  AI Review Preview
                </p>
                <p className="mt-3">{aiSummary}</p>
                {aiConfidence !== null && aiConfidence !== undefined ? (
                  <p className="mt-2 text-xs text-indigo-200/80">Confidence preview: {aiConfidence}%</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      {canReview && status === "PENDING" ? (
        <CardFooter className="flex justify-end gap-2 border-t border-zinc-800/20 bg-zinc-900/20 pt-4">
          <form action={verifyCheckInAction.bind(null, { checkInId, verdict: "FLAG" })}>
            <Button type="submit" variant="ghost" size="sm" className="text-zinc-400 hover:text-white">
              Flag
            </Button>
          </form>
          <form action={verifyCheckInAction.bind(null, { checkInId, verdict: "APPROVE" })}>
            <Button
              type="submit"
              size="sm"
              className="border border-primary/30 bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all hover:bg-primary hover:text-white"
            >
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
          </form>
        </CardFooter>
      ) : null}
    </Card>
  );
}
