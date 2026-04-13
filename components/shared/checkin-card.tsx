"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CheckCircle2, Flag, Gavel, ShieldAlert, X } from "lucide-react";
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
  verifications?: { reviewer: { name: string }; verdict: "APPROVE" | "FLAG" }[];
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
  verifications = [],
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
    <div className="border border-rule bg-background relative z-10 flex flex-col">
      {/* Header */}
      <div className="border-b border-rule p-4 md:p-6 flex justify-between items-start md:items-center bg-surface/50 relative">
        <div className="flex items-center gap-4">
          <div className="size-10 flex shrink-0 items-center justify-center border border-foreground bg-background">
            <span className="font-serif text-xl text-foreground">{user.charAt(0)}</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-serif text-xl text-parchment tracking-tight">{user}</span>
              {isEarlyBird ? (
                <span className="font-mono text-[10px] tracking-widest uppercase border border-verified/50 px-2 py-0.5 text-verified bg-verified/10">
                  EARLY BIRD
                </span>
              ) : null}
              {isChallengeMode ? (
                <span className="font-mono text-[10px] tracking-widest uppercase border border-wax/50 px-2 py-0.5 text-wax bg-wax/10">
                  CHALLENGE
                </span>
              ) : null}
            </div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-parchment-muted mt-1">
              {time}
            </div>
          </div>
        </div>
        
        <div className="flex flex-col items-end gap-2 shrink-0">
          {status === "APPROVED" ? (
            <div className="font-mono text-[10px] tracking-widest uppercase border border-verified px-2 py-1 text-verified bg-verified/10 flex items-center">
              <CheckCircle2 className="mr-1 h-3 w-3 inline" /> VERIFIED
            </div>
          ) : null}
          {status === "PENDING" ? (
            <div className="font-mono text-[10px] tracking-widest uppercase border border-rule px-2 py-1 text-parchment-muted bg-surface">
              PENDING TRIBUNAL
            </div>
          ) : null}
          {status === "FLAGGED" ? (
            <div className="font-mono text-[10px] tracking-widest uppercase border border-amber-500 px-2 py-1 text-amber-500 bg-amber-500/10 flex items-center">
              <Flag className="mr-1 h-3 w-3 inline" /> DISPUTED
            </div>
          ) : null}
          {status === "REJECTED" ? (
            <div className="font-mono text-[10px] tracking-widest uppercase border border-wax px-2 py-1 text-wax bg-wax/10 flex items-center">
              <ShieldAlert className="mr-1 h-3 w-3 inline" /> REJECTED
            </div>
          ) : null}
        </div>
      </div>

      <div className="p-4 md:p-6 flex flex-col gap-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {proofs.map((proof) => (
            <div key={proof.label} className="border border-rule bg-surface p-1">
              <div className="font-mono text-[10px] tracking-widest uppercase text-parchment-muted p-2 border-b border-rule mb-1 bg-background/50">
                {proof.label.toUpperCase()}
              </div>
              <div className="border border-rule/50 relative flex items-center justify-center bg-background min-h-[160px]">
                {proof.url ? (
                  <a
                    href={proof.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full h-full"
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
                  <div className="flex w-full h-full items-center justify-center p-4">
                    <span className="font-mono text-xs text-parchment-muted tracking-widest uppercase border border-rule border-dashed px-3 py-2 bg-background/80">
                      NULL EVIDENCE
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {tasks.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="font-mono text-[10px] tracking-widest uppercase text-parchment-muted border-b border-rule pb-1">
              OBLIGATIONS CLAIMED
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              {tasks.map((task) => (
                <span key={task} className="font-mono text-[10px] tracking-widest uppercase border border-rule bg-surface p-1.5 text-parchment">
                  {task}
                </span>
              ))}
            </div>
          </div>
        ) : null}

        <div className="border border-rule bg-surface p-4 flex flex-col gap-3">
          <div className="font-mono text-[10px] tracking-widest uppercase text-parchment-muted border-b border-rule pb-1">
            SYNTHESIS / REFLECTION
          </div>
          <p className="font-serif text-base text-parchment leading-relaxed pl-3 border-l-2 border-rule">
            &quot;{reflection}&quot;
          </p>
        </div>

        {verifications.length > 0 && (
          <div className="border border-rule bg-surface p-3 flex flex-col">
            <div className="font-mono text-[10px] tracking-widest uppercase text-parchment-muted border-b border-rule pb-1 mb-2">
              TRIBUNAL LEDGER
            </div>
            <div className="font-serif text-sm text-parchment-muted flex flex-wrap gap-1.5 items-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-verified inline" />
              Verified by: 
              <span className="text-foreground border-b border-foreground/30 ml-1">
                {verifications.filter(v => v.verdict === "APPROVE").map(v => v.reviewer.name).join(", ") || "Null"}
              </span>
              {verifications.some(v => v.verdict === "FLAG") && (
                <span className="text-amber-500 ml-2">
                  (Flagged by: {verifications.filter(v => v.verdict === "FLAG").map(v => v.reviewer.name).join(", ")})
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {canReview && status === "PENDING" ? (
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 border-t border-rule bg-surface/30 p-4 shrink-0">
          <div className="flex flex-wrap gap-2 w-full md:w-auto">
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
                  className={`flex items-center gap-2 border px-3 py-1.5 font-mono text-[10px] tracking-widest uppercase transition-colors ${
                    current?.active
                      ? "border-primary bg-primary/10 text-wax"
                      : "border-rule bg-background text-parchment-muted hover:text-foreground"
                  }`}
                >
                  <span>{reaction.emoji}</span> <span>{current?.count ?? 0}</span>
                </button>
              );
            })}
          </div>
          <div className="flex justify-end gap-3 w-full md:w-auto shrink-0 flex-wrap">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={isPending}
              className="font-mono text-xs tracking-widest uppercase border border-rule rounded-none hover:bg-wax hover:text-parchment hover:border-wax transition-colors"
              onClick={() =>
                runAsyncAction(async () => {
                  const result = await verifyCheckInAction({ checkInId, verdict: "FLAG" });
                  if (result.sentToLeader) {
                    toast.warning("Dispute threshold reached. Escalated to leader.");
                  } else {
                    toast.success(result.resolved ? "Vote submitted. Status resolved." : "Objection recorded.");
                  }
                })
              }
            >
              Raise Dispute
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              className="font-mono text-xs tracking-widest uppercase border border-primary bg-background text-foreground rounded-none hover:bg-foreground hover:text-background transition-colors"
              onClick={() =>
                runAsyncAction(async () => {
                  const result = await verifyCheckInAction({ checkInId, verdict: "APPROVE" });
                  toast.success(result.resolved ? "Evidence authenticated." : "Verification recorded.");
                })
              }
            >
              <Check className="mr-2 h-3 w-3" /> Authenticate
            </Button>
          </div>
        </div>
      ) : null}

      {isLeader && status === "FLAGGED" ? (
        <div className="flex flex-col gap-3 border-t border-amber-500/30 bg-amber-500/5 p-4">
          <div className="font-mono text-[10px] tracking-widest uppercase text-amber-500 border border-amber-500/30 px-2 py-1 self-start bg-amber-500/10">
            ESCALATION PENDING LEADERSHIP REVIEW
          </div>
          <div className="flex w-full gap-3">
            <Button
              type="button"
              size="sm"
              disabled={isPending}
              className="flex-1 font-mono text-xs tracking-widest uppercase border border-wax bg-wax/10 text-wax hover:bg-wax hover:text-parchment rounded-none transition-colors"
              onClick={() =>
                runAsyncAction(async () => {
                  await leaderResolveCheckInAction({ checkInId, verdict: "REJECT" });
                  toast.success("Execution forfeit. Penalty enacted.");
                })
              }
            >
              <Gavel className="mr-2 h-4 w-4" /> Reject Evidence
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={isPending}
              className="flex-1 font-mono text-xs tracking-widest uppercase border border-rule text-parchment-muted hover:text-foreground rounded-none transition-colors bg-surface/50"
              onClick={() =>
                runAsyncAction(async () => {
                  await leaderResolveCheckInAction({ checkInId, verdict: "APPROVE" });
                  toast.success("Evidence overridden and verified.");
                })
              }
            >
              <X className="mr-2 h-4 w-4" /> Override to Approve
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
