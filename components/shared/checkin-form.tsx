"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, ChevronDown, ChevronUp, CheckCircle2, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { submitCheckInAction } from "@/lib/actions/studypact";
import { UploadButton } from "@/lib/uploadthing/uploadthing";
import { cn } from "@/lib/utils";

type CheckinFormProps = {
  groupId: string;
  tasks: { id: string; title: string; status: string }[];
};

type UploadSlot = "start" | "end";

type UploadedProof = {
  fileId: string;
  url: string;
} | null;

type TaskProofState = {
  start: UploadedProof;
  end: UploadedProof;
};

type UploadPanelProps = {
  title: string;
  helper: string;
  groupId: string;
  taskId: string;
  slot: UploadSlot;
  uploadedProof: UploadedProof;
  onUploaded: (proof: UploadedProof) => void;
};

function UploadPanel({
  title,
  helper,
  groupId,
  taskId,
  slot,
  uploadedProof,
  onUploaded,
}: UploadPanelProps) {
  const isUploaded = Boolean(uploadedProof?.url);

  return (
    <div className="space-y-3">
      <label className="ml-1 text-sm font-medium text-foreground">{title}</label>

      {isUploaded && uploadedProof?.url ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedProof.url}
            alt={`${title} preview`}
            className="max-h-56 w-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-background/80 px-4 py-2 backdrop-blur-sm">
            <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-300">
              <Camera className="h-3.5 w-3.5" /> {title} uploaded
            </span>
            <UploadButton
              endpoint="attachmentUploader"
              input={{ groupId, slot, taskId }}
              appearance={{
                button:
                  "ut-ready:bg-secondary ut-ready:hover:bg-secondary/90 ut-ready:text-xs ut-ready:h-7 ut-ready:px-3 ut-uploading:bg-secondary",
                allowedContent: "hidden",
              }}
              onClientUploadComplete={(res) => {
                const item = res?.[0];
                onUploaded(item?.serverData ? { fileId: item.serverData.fileId, url: item.url } : null);
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-card/70 px-6 py-8 text-center transition-all hover:border-primary/40 hover:bg-secondary/40">
          <div className="rounded-full bg-secondary p-4">
            <Camera className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="mt-4 text-sm font-medium text-foreground">Upload {title.toLowerCase()}</p>
          <p className="mt-1 text-xs text-muted-foreground">{helper}</p>
          <div className="mt-5">
            <UploadButton
              endpoint="attachmentUploader"
              input={{ groupId, slot, taskId }}
              appearance={{
                button:
                  "ut-ready:bg-primary ut-ready:hover:bg-primary/90 ut-uploading:bg-primary/80 ut-label:text-primary-foreground ut-allowed-content:text-muted-foreground",
                allowedContent: "text-muted-foreground text-xs",
              }}
              onClientUploadComplete={(res) => {
                const item = res?.[0];
                onUploaded(item?.serverData ? { fileId: item.serverData.fileId, url: item.url } : null);
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckinForm({ groupId, tasks }: CheckinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [taskProofs, setTaskProofs] = useState<Record<string, TaskProofState>>({});
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(tasks[0]?.id ?? null);
  const [reflection, setReflection] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const setTaskProof = (taskId: string, slot: UploadSlot, proof: UploadedProof) => {
    setTaskProofs((current) => {
      const existing = current[taskId] ?? { start: null, end: null };
      return {
        ...current,
        [taskId]: {
          start: slot === "start" ? proof : existing.start,
          end: slot === "end" ? proof : existing.end,
        },
      };
    });
  };

  const completedTaskProofs = useMemo(
    () =>
      tasks
        .map((task) => ({
          taskId: task.id,
          start: taskProofs[task.id]?.start ?? null,
          end: taskProofs[task.id]?.end ?? null,
        }))
        .filter((task) => task.start?.fileId && task.end?.fileId),
    [taskProofs, tasks],
  );

  const handleSubmit = () => {
    if (!completedTaskProofs.length) {
      return;
    }

    const primaryProof = completedTaskProofs[0];
    if (!primaryProof?.start?.fileId || !primaryProof?.end?.fileId) {
      return;
    }
    const startProof = primaryProof.start;
    const endProof = primaryProof.end;

    startTransition(async () => {
      try {
        const result = await submitCheckInAction({
          groupId,
          reflection,
          proofText,
          proofLink,
          startFileId: startProof.fileId,
          endFileId: endProof.fileId,
          taskProofs: completedTaskProofs.map((task) => ({
            taskId: task.taskId,
            startFileId: task.start!.fileId,
            endFileId: task.end!.fileId,
          })),
        });

        if (result.success) {
          toast.success("Check-in submitted for peer review.");
          setMessage(`Attached proof pairs for ${completedTaskProofs.length} task${completedTaskProofs.length === 1 ? "" : "s"}.`);
          router.refresh();
        }
      } catch (error) {
        const nextMessage = error instanceof Error ? error.message : "Failed to submit check-in";
        setMessage(nextMessage);
        toast.error(nextMessage);
      }
    });
  };

  return (
    <Card className="relative overflow-hidden border-border bg-card/90 shadow-2xl backdrop-blur-xl">
      <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
      <CardHeader>
        <CardTitle className="text-xl text-foreground">Daily Check-in</CardTitle>
        <CardDescription className="text-muted-foreground">
          Expand each task, attach a start and end proof, then submit one shared reflection for the day.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {tasks.map((task) => {
            const proofs = taskProofs[task.id] ?? { start: null, end: null };
            const hasBoth = Boolean(proofs.start?.fileId && proofs.end?.fileId);
            const isExpanded = expandedTaskId === task.id;

            return (
              <div
                key={task.id}
                className={cn(
                  "overflow-hidden rounded-2xl border transition-colors",
                  hasBoth ? "border-emerald-500/30 bg-emerald-500/8" : "border-border bg-card/60",
                )}
              >
                <button
                  type="button"
                  onClick={() => setExpandedTaskId((current) => (current === task.id ? null : task.id))}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{task.title}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full border border-border bg-secondary px-2.5 py-1 text-muted-foreground">
                        {task.status === "COMPLETED" ? "Task complete" : "Task pending"}
                      </span>
                      <span
                        className={cn(
                          "rounded-full border px-2.5 py-1",
                          hasBoth
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                            : "border-border bg-background text-muted-foreground",
                        )}
                      >
                        {hasBoth ? "Both photos uploaded" : "Waiting for proof"}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {hasBoth ? <CheckCircle2 className="h-4 w-4 text-emerald-300" /> : null}
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </button>

                {isExpanded ? (
                  <div className="grid gap-4 border-t border-border px-5 py-5 md:grid-cols-2">
                    <UploadPanel
                      title="Upload Start Photo"
                      helper="Capture how this task looked when you began."
                      groupId={groupId}
                      taskId={task.id}
                      slot="start"
                      uploadedProof={proofs.start}
                      onUploaded={(proof) => setTaskProof(task.id, "start", proof)}
                    />
                    <UploadPanel
                      title="Upload End Photo"
                      helper="Upload the finished outcome for this task."
                      groupId={groupId}
                      taskId={task.id}
                      slot="end"
                      uploadedProof={proofs.end}
                      onUploaded={(proof) => setTaskProof(task.id, "end", proof)}
                    />
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border bg-background/70 px-4 py-4 text-sm text-muted-foreground">
          {completedTaskProofs.length > 0
            ? `${completedTaskProofs.length} task${completedTaskProofs.length === 1 ? "" : "s"} ready to submit with complete proof pairs.`
            : "Upload both photos for at least one task to enable submission."}
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-foreground">Proof Note / Commit / Update</label>
          <Textarea
            value={proofText}
            onChange={(event) => setProofText(event.target.value)}
            placeholder="Paste a commit, explain the proof, or add a concise update..."
            className="h-20 resize-none rounded-xl border-border bg-card text-foreground focus-visible:ring-primary/50"
          />
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-foreground">Proof Link</label>
          <input
            value={proofLink}
            onChange={(event) => setProofLink(event.target.value)}
            placeholder="GitHub, LeetCode, docs, or demo link..."
            className="h-12 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="ml-1 text-sm font-medium text-foreground">Daily Reflection</label>
          <Textarea
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What did you learn, ship, or get unstuck on today?"
            className="h-24 resize-none rounded-xl border-border bg-card text-foreground focus-visible:ring-primary/50"
          />
        </div>

        {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!completedTaskProofs.length || isPending}
          className="ml-auto rounded-xl px-8 shadow-[0_0_20px_rgba(var(--primary),0.2)]"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Submit Check-in
        </Button>
      </CardFooter>
    </Card>
  );
}
