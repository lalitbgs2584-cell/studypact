"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Lock, Loader2, Plus, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createTaskAction } from "@/lib/actions/studypact";

type GroupOption = {
  id: string;
  name: string;
  role?: string | null;
  taskPostingMode?: string | null;
};

type CreateTaskDialogProps = {
  groups: GroupOption[];
};

export function CreateTaskDialog({ groups }: CreateTaskDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [scope, setScope] = useState<"PERSONAL" | "GROUP">("PERSONAL");
  const [groupId, setGroupId] = useState(groups[0]?.id ?? "");

  const selectedGroup = groups.find((group) => group.id === groupId) ?? groups[0];
  const canPostGroupTask =
    selectedGroup?.role === "admin" || selectedGroup?.taskPostingMode === "ALL_MEMBERS";
  const effectiveScope = scope === "GROUP" && canPostGroupTask ? "GROUP" : "PERSONAL";

  const resetForm = () => {
    setTitle("");
    setScope("PERSONAL");
    setGroupId(groups[0]?.id ?? "");
  };

  const handleSubmit = () => {
    if (!title.trim() || !groupId) {
      return;
    }

    startTransition(async () => {
      try {
        await createTaskAction({
          groupId,
          title,
          scope: effectiveScope,
        });

        toast.success(`"${title.trim()}" added.`);
        setOpen(false);
        resetForm();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Could not create the task");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button className="fixed right-6 bottom-6 z-40 h-14 w-14 rounded-full bg-primary shadow-[0_0_30px_rgba(var(--primary),0.45)] hover:bg-primary/90" />
        }
      >
        <Plus className="h-6 w-6" />
        <span className="sr-only">Create task</span>
      </DialogTrigger>

      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto rounded-3xl border border-border bg-card p-0 text-foreground">
        <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-primary" />
        <div className="space-y-6 p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl text-foreground">Add Task</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Keep it simple: add the task, choose whether it is personal or for the group, and submit.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Task</label>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="What do you need to do today?"
              className="h-14 rounded-2xl border-border bg-background text-base text-foreground"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-foreground">Type</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setScope("PERSONAL")}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  effectiveScope === "PERSONAL"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-secondary",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-secondary p-2">
                    <Lock className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Personal</p>
                    <p className="text-xs text-muted-foreground">Only for your own checklist.</p>
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => canPostGroupTask && setScope("GROUP")}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  effectiveScope === "GROUP"
                    ? "border-primary bg-primary/10"
                    : "border-border bg-background hover:bg-secondary",
                  !canPostGroupTask && "cursor-not-allowed opacity-60",
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="rounded-xl bg-secondary p-2">
                    <Users className="h-4 w-4 text-foreground" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">Group</p>
                    <p className="text-xs text-muted-foreground">Post it for everyone in one group.</p>
                  </div>
                </div>
              </button>
            </div>
          </div>

          {effectiveScope === "GROUP" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Group</label>
              <select
                value={groupId}
                onChange={(event) => setGroupId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none"
              >
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              {!canPostGroupTask ? (
                <p className="text-xs text-muted-foreground">
                  This group only lets admins publish group tasks.
                </p>
              ) : null}
            </div>
          ) : null}

          <Button
            type="button"
            disabled={isPending || !title.trim() || !groupId}
            onClick={handleSubmit}
            className="h-12 w-full rounded-2xl bg-gradient-to-r from-primary via-primary to-accent text-primary-foreground shadow-[0_0_25px_rgba(var(--primary),0.3)] hover:opacity-95"
          >
            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Add Task
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
