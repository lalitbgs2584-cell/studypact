"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  issueRedemptionTaskAction,
  submitRedemptionTaskAction,
  resolveRedemptionTaskAction,
} from "@/lib/actions/studypact";

type Member = { id: string; name: string; penaltyCount: number };
type RedemptionTask = {
  id: string;
  title: string;
  details: string | null;
  status: string;
  targetUserId: string;
  targetName: string;
  startFileUrl: string | null;
  endFileUrl: string | null;
  reflection: string | null;
  createdAt: Date;
};
type PenaltyEvent = { id: string; userId: string; userName: string; reason: string; points: number; createdAt: Date };

const statusColors: Record<string, string> = {
  PENDING: "border-zinc-700 text-zinc-400",
  SUBMITTED: "border-amber-500/40 text-amber-300",
  APPROVED: "border-emerald-500/40 text-emerald-300",
  REJECTED: "border-red-500/40 text-red-300",
};

export function RedemptionClient({
  groupId,
  isAdmin,
  currentUserId,
  members,
  redemptionTasks,
  penaltyEvents,
}: {
  groupId: string;
  isAdmin: boolean;
  currentUserId: string;
  members: Member[];
  redemptionTasks: RedemptionTask[];
  penaltyEvents: PenaltyEvent[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [penaltyEventId, setPenaltyEventId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // For member submission
  const [submitTaskId, setSubmitTaskId] = useState<string | null>(null);
  const [startUrl, setStartUrl] = useState("");
  const [endUrl, setEndUrl] = useState("");
  const [reflection, setReflection] = useState("");

  const myPendingTasks = redemptionTasks.filter(
    (t) => t.targetUserId === currentUserId && t.status === "PENDING",
  );
  const mySubmittedTasks = redemptionTasks.filter(
    (t) => t.targetUserId === currentUserId && t.status === "SUBMITTED",
  );

  async function handleIssue() {
    setLoading(true);
    setError("");
    try {
      await issueRedemptionTaskAction({ groupId, targetUserId, title, details: details || undefined, penaltyEventId: penaltyEventId || undefined });
      setOpen(false); setTargetUserId(""); setTitle(""); setDetails(""); setPenaltyEventId("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to issue task");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(taskId: string) {
    setLoading(true);
    try {
      await submitRedemptionTaskAction({ redemptionTaskId: taskId, startFileUrl: startUrl, endFileUrl: endUrl, reflection });
      setSubmitTaskId(null); setStartUrl(""); setEndUrl(""); setReflection("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to submit");
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(taskId: string, approve: boolean) {
    await resolveRedemptionTaskAction({ redemptionTaskId: taskId, approve });
    router.refresh();
  }

  const targetPenalties = penaltyEvents.filter((p) => p.userId === targetUserId);

  return (
    <div className="space-y-8">
      {/* My assigned tasks */}
      {(myPendingTasks.length > 0 || mySubmittedTasks.length > 0) && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-white">Your Redemption Tasks</h2>
          {[...myPendingTasks, ...mySubmittedTasks].map((task) => (
            <div key={task.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{task.title}</h3>
                  {task.details && <p className="text-sm text-zinc-400 mt-1">{task.details}</p>}
                </div>
                <Badge className={`border ${statusColors[task.status]} bg-transparent`}>{task.status}</Badge>
              </div>
              {task.status === "PENDING" && (
                <>
                  {submitTaskId === task.id ? (
                    <div className="space-y-3 pt-2">
                      <Input placeholder="Start proof URL" value={startUrl} onChange={(e) => setStartUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
                      <Input placeholder="End proof URL" value={endUrl} onChange={(e) => setEndUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
                      <Textarea placeholder="What did you do?" value={reflection} onChange={(e) => setReflection(e.target.value)} rows={3} className="bg-zinc-900 border-zinc-700 text-white" />
                      <div className="flex gap-3">
                        <Button onClick={() => handleSubmit(task.id)} disabled={loading || !startUrl || !endUrl || !reflection}>Submit</Button>
                        <Button variant="outline" onClick={() => setSubmitTaskId(null)} className="border-zinc-700 text-zinc-300">Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" onClick={() => setSubmitTaskId(task.id)}>Submit Proof</Button>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Admin: issue task */}
      {isAdmin && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Issue Redemption Task</h2>
            {!open && (
              <Button size="sm" onClick={() => setOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Issue Task
              </Button>
            )}
          </div>

          {open && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Target Member</label>
                <select
                  value={targetUserId}
                  onChange={(e) => setTargetUserId(e.target.value)}
                  className="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-white px-3 py-2 text-sm"
                >
                  <option value="">Select member...</option>
                  {members.filter((m) => m.id !== currentUserId).map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.penaltyCount} penalties)</option>
                  ))}
                </select>
              </div>

              {targetUserId && targetPenalties.length > 0 && (
                <div>
                  <label className="text-xs text-zinc-500 uppercase tracking-wider mb-1 block">Link to Penalty (optional)</label>
                  <select
                    value={penaltyEventId}
                    onChange={(e) => setPenaltyEventId(e.target.value)}
                    className="w-full rounded-xl bg-zinc-900 border border-zinc-700 text-white px-3 py-2 text-sm"
                  >
                    <option value="">None</option>
                    {targetPenalties.map((p) => (
                      <option key={p.id} value={p.id}>{p.reason} (-{p.points} pts)</option>
                    ))}
                  </select>
                </div>
              )}

              <Input placeholder="Task title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              <Textarea placeholder="Task details / instructions..." value={details} onChange={(e) => setDetails(e.target.value)} rows={3} className="bg-zinc-900 border-zinc-700 text-white" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <Button onClick={handleIssue} disabled={loading || !targetUserId || !title}>
                  {loading ? "Issuing..." : "Issue Task"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 text-zinc-300">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* All tasks list */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">All Redemption Tasks</h2>
        {redemptionTasks.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center text-zinc-500">
            <ShieldCheck className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
            <p>No redemption tasks issued yet.</p>
          </div>
        ) : (
          redemptionTasks.map((task) => (
            <div key={task.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-white">{task.title}</h3>
                  <p className="text-xs text-zinc-500 mt-1">Assigned to {task.targetName} · {new Date(task.createdAt).toLocaleDateString("en-IN")}</p>
                  {task.details && <p className="text-sm text-zinc-400 mt-1">{task.details}</p>}
                </div>
                <Badge className={`border ${statusColors[task.status]} bg-transparent`}>{task.status}</Badge>
              </div>

              {task.status === "SUBMITTED" && (
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-2">
                  <p className="text-xs text-zinc-500 uppercase tracking-wider">Submission</p>
                  {task.reflection && <p className="text-sm text-zinc-300">{task.reflection}</p>}
                  <div className="flex gap-4 text-xs">
                    {task.startFileUrl && <a href={task.startFileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">Start proof</a>}
                    {task.endFileUrl && <a href={task.endFileUrl} target="_blank" rel="noreferrer" className="text-primary hover:underline">End proof</a>}
                  </div>
                  {isAdmin && (
                    <div className="flex gap-3 pt-2">
                      <Button size="sm" onClick={() => handleResolve(task.id, true)} className="bg-emerald-600 hover:bg-emerald-700">Approve & Wipe Penalty</Button>
                      <Button size="sm" variant="outline" onClick={() => handleResolve(task.id, false)} className="border-red-700 text-red-400 hover:bg-red-950">Reject</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
