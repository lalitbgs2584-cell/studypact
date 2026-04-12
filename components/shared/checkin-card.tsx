"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCircle2, ExternalLink, Flag, Gavel, ShieldAlert, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { leaderResolveCheckInAction, reactToCheckInAction, verifyCheckInAction } from "@/lib/actions/studypact";

const REACTIONS = [
  { kind: "FIRE" as const, emoji: "Fire" },
  { kind: "STRONG" as const, emoji: "Strong" },
  { kind: "THINKING" as const, emoji: "Thinking" },
  { kind: "EYES" as const, emoji: "Eyes" },
];

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
  isLeader?: boolean;
  isEarlyBird?: boolean;
  isChallengeMode?: boolean;
  reactions?: { kind: "FIRE" | "STRONG" | "THINKING" | "EYES"; count: number; active: boolean }[];
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
  isLeader = false,
  isEarlyBird = false,
  isChallengeMode = false,
  reactions = [],
}: CheckinCardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const runAsyncAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Something went wrong");
      }
    });
  };

  const proofs = [
    { label: "Start Proof", url: startUrl },
    { label: "End Proof", url: endUrl },
  ];

  return (
    <Card className="overflow-hidden border-border bg-background/60 backdrop-blur-xl transition-all hover:border-border/80">
      <CardHeader className="flex flex-row items-center justify-between border-b border-border/60 pb-2">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-accent p-[2px]">
            <div className="flex h-full w-full items-center justify-center rounded-full border border-border bg-background">
              <span className="text-sm font-bold text-foreground">{user.charAt(0)}</span>
            </div>
          </div>
          <div>
            <CardTitle className="flex items-center gap-2 text-base text-foreground">
              {user}
              {isEarlyBird ? (
                <span className="rounded-full border border-accent/30 bg-accent/10 px-2 py-0.5 text-xs text-accent">
                  Early Bird
                </span>
              ) : null}
              {isChallengeMode ? (
                <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-xs text-red-300">
                  Challenge
                </span>
              ) : null}
            </CardTitle>
            <CardDescription className="text-xs text-muted-foreground">{time}</CardDescription>
          </div>
        </div>
        {status === "APPROVED" ? (
          <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
            <CheckCircle2 className="mr-1 h-3 w-3" /> Verified
          </Badge>
        ) : null}
        {status === "PENDING" ? (
          <Badge variant="secondary" className="border-border bg-secondary text-foreground">
            Pending Review
          </Badge>
        ) : null}
        {status === "FLAGGED" ? (
          <Badge variant="destructive" className="border-amber-500/20 bg-amber-500/10 text-amber-300">
            <Flag className="mr-1 h-3 w-3" /> Flagged
          </Badge>
        ) : null}
        {status === "REJECTED" ? (
          <Badge variant="destructive" className="border-red-500/20 bg-red-500/10 text-red-300">
            <ShieldAlert className="mr-1 h-3 w-3" /> Rejected
          </Badge>
        ) : null}
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(280px,0.9fr)]">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {proofs.map((proof) => (
                <div key={proof.label} className="rounded-2xl border border-border bg-card p-4">
                  <p className="text-xs text-muted-foreground">{proof.label}</p>
                  {proof.url ? (
                    <a
                      href={proof.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 block overflow-hidden rounded-xl border border-border"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={proof.url}
                        alt={proof.label}
                        loading="lazy"
                        className="max-h-48 w-full object-cover"
                      />
                    </a>
                  ) : (
                    <div className="mt-3 flex min-h-32 items-center justify-center rounded-xl border border-dashed border-border bg-background px-3 text-center text-sm text-muted-foreground">
                      No photo uploaded
                    </div>
                  )}
                </div>
              ))}
            </div>

            {tasks.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {tasks.map((task) => (
                  <Badge key={task} variant="secondary" className="border-border bg-secondary text-foreground">
                    {task}
                  </Badge>
                ))}
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-card/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Reflection</p>
              <p className="mt-3 text-sm leading-relaxed text-foreground">&quot;{reflection}&quot;</p>
            </div>
          </div>

          <div className="space-y-4">
            {proofText ? (
              <div className="rounded-2xl border border-border bg-card/70 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Proof Note</p>
                <p className="mt-3 text-sm text-foreground">{proofText}</p>
              </div>
            ) : null}

            <div className="rounded-2xl border border-border bg-card/70 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">External Proof</p>
              {proofLink ? (
                <a
                  href={proofLink}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground transition-colors hover:bg-secondary"
                >
                  Open Proof Link <ExternalLink className="h-3.5 w-3.5" />
                </a>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No extra proof link was attached.</p>
              )}
            </div>

            {aiSummary ? (
              <div className="rounded-2xl border border-primary/20 bg-primary/10 px-4 py-4 text-sm text-foreground">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  AI Review Preview
                </p>
                <p className="mt-3">{aiSummary}</p>
                {aiConfidence !== null && aiConfidence !== undefined ? (
                  <p className="mt-2 text-xs text-primary/80">Confidence preview: {aiConfidence}%</p>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>

      {canReview && status === "PENDING" ? (
        <CardFooter className="flex flex-col gap-3 border-t border-border/60 bg-card/50 pt-4">
          <div className="flex w-full flex-wrap gap-2">
            {REACTIONS.map((reaction) => {
              const current = reactions.find((item) => item.kind === reaction.kind);
              return (
                <button
                  key={reaction.kind}
                  type="button"
                  disabled={isPending}
                  onClick={() =>
                    runAsyncAction(async () => {
                      await reactToCheckInAction({ checkInId, kind: reaction.kind });
                    })
                  }
                  className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-sm transition-colors ${
                    current?.active
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {reaction.emoji} {current?.count ?? 0}
                </button>
              );
            })}
          </div>
          <div className="flex w-full justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="text-muted-foreground hover:text-foreground"
              onClick={() =>
                runAsyncAction(async () => {
                  const result = await verifyCheckInAction({ checkInId, verdict: "FLAG" });
                  if (result.sentToLeader) {
                    toast.warning("Reject threshold reached. Sent to the group leader for final review.");
                  } else {
                    toast.success(result.resolved ? "Vote submitted and submission resolved." : "Flag vote recorded.");
                  }
                })
              }
            >
              Flag
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              className="border border-primary/30 bg-primary/20 text-primary shadow-[0_0_15px_rgba(var(--primary),0.2)] transition-all hover:bg-primary hover:text-primary-foreground"
              onClick={() =>
                runAsyncAction(async () => {
                  const result = await verifyCheckInAction({ checkInId, verdict: "APPROVE" });
                  toast.success(result.resolved ? "Submission approved." : "Approval vote recorded.");
                })
              }
            >
              <Check className="mr-1 h-4 w-4" /> Approve
            </Button>
          </div>
        </CardFooter>
      ) : null}

      {isLeader && status === "FLAGGED" ? (
        <CardFooter className="flex flex-col gap-2 border-t border-amber-500/20 bg-amber-500/5 pt-4">
          <p className="w-full text-xs font-medium text-amber-300">Dispute pending your review</p>
          <div className="flex w-full gap-2">
            <Button
              type="button"
              size="sm"
                disabled={isPending}
              className="w-full border border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/20"
              onClick={() =>
                runAsyncAction(async () => {
                  await leaderResolveCheckInAction({ checkInId, verdict: "REJECT" });
                  toast.success("Leader rejected the submission.");
                })
              }
            >
              <Gavel className="mr-1.5 h-3.5 w-3.5" /> Reject submission
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
                className="w-full border-border text-muted-foreground hover:text-foreground"
              onClick={() =>
                runAsyncAction(async () => {
                  await leaderResolveCheckInAction({ checkInId, verdict: "APPROVE" });
                  toast.success("Leader approved the submission.");
                })
              }
            >
              <X className="mr-1.5 h-3.5 w-3.5" /> Approve submission
            </Button>
          </div>
        </CardFooter>
      ) : null}
    </Card>
  );
}
