"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, ShieldAlert, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { leaderResolveCheckInAction, verifyCheckInAction } from "@/lib/actions/studypact";

type UploadReviewActionsProps = {
  checkInId: string;
  mode: "peer" | "leader";
};

export function UploadReviewActions({ checkInId, mode }: UploadReviewActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const runAction = (action: () => Promise<void>) => {
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not update this review");
      }
    });
  };

  if (mode === "leader") {
    return (
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          disabled={isPending}
          className="flex-1"
          onClick={() =>
            runAction(async () => {
              await leaderResolveCheckInAction({ checkInId, verdict: "APPROVE" });
              toast.success("Leader approved the submission.");
            })
          }
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Accept Upload
        </Button>
        <Button
          type="button"
          disabled={isPending}
          variant="destructive"
          className="flex-1"
          onClick={() =>
            runAction(async () => {
              await leaderResolveCheckInAction({ checkInId, verdict: "REJECT" });
              toast.warning("Leader rejected the submission and applied the penalty.");
            })
          }
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldAlert className="mr-2 h-4 w-4" />}
          Reject Upload
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Button
        type="button"
        disabled={isPending}
        className="flex-1"
        onClick={() =>
          runAction(async () => {
            const result = await verifyCheckInAction({ checkInId, verdict: "APPROVE" });
            toast.success(result.resolved ? "Upload accepted." : "Approval recorded.");
          })
        }
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
        Accept
      </Button>
      <Button
        type="button"
        disabled={isPending}
        variant="outline"
        className="flex-1 border-amber-500/30 text-amber-300 hover:bg-amber-500/10 hover:text-amber-200"
        onClick={() =>
          runAction(async () => {
            const result = await verifyCheckInAction({ checkInId, verdict: "FLAG" });
            if (result.sentToLeader) {
              toast.warning("Peer rejects reached the threshold. Sent to the group leader.");
            } else {
              toast.success("Reject vote recorded.");
            }
          })
        }
      >
        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <X className="mr-2 h-4 w-4" />}
        Reject
      </Button>
    </div>
  );
}
