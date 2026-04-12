import { notFound } from "next/navigation";
import { Camera, CheckCircle2 } from "lucide-react";
import { CheckinForm } from "@/components/shared/checkin-form";
import { GroupNav } from "@/components/shared/group-nav";
import { MidnightCountdown } from "@/components/shared/midnight-countdown";
import { MobileGroupNav } from "@/components/shared/mobile-group-nav";
import { prisma } from "@/lib/db";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { startOfDay } from "@/lib/studypact";

export default async function GroupCheckinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/checkin`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) notFound();

  const today = startOfDay();

  const [todayTasks, todayCheckIn] = await Promise.all([
    prisma.task.findMany({
      where: { userId: user.id, groupId: id, day: today },
      select: { id: true, title: true, status: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.checkIn.findFirst({
      where: { userId: user.id, groupId: id, day: today },
      select: { status: true, createdAt: true },
    }),
  ]);

  const alreadySubmitted = Boolean(todayCheckIn);
  const completedCount = todayTasks.filter((t) => t.status === "COMPLETED").length;

  return (
    <div className="max-w-2xl mx-auto space-y-6 py-8 pb-20 md:pb-8 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500 mb-1">{membership.group.name}</p>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Camera className="w-7 h-7 text-primary" /> Submit Today&apos;s Proof
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Upload a photo when you start, another when you finish, then write what you learned.
          </p>
        </div>
        <MidnightCountdown submitted={alreadySubmitted} />
      </div>

      <GroupNav groupId={id} active="checkin" />

      {/* Already submitted banner */}
      {alreadySubmitted && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-300">
              {todayCheckIn?.status === "APPROVED" ? "Approved ✓" : "Submitted — waiting for peer review"}
            </p>
            <p className="text-xs text-emerald-400/70 mt-0.5">
              You can resubmit to replace your proof if needed.
            </p>
          </div>
        </div>
      )}

      {/* Today's tasks summary */}
      {todayTasks.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/40 px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-zinc-300">Today&apos;s tasks</p>
            <span className="text-xs text-zinc-500">{completedCount}/{todayTasks.length} completed</span>
          </div>
          <div className="space-y-1.5">
            {todayTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-2.5 text-sm">
                <span className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                  task.status === "COMPLETED"
                    ? "border-emerald-500 bg-emerald-500/20"
                    : "border-zinc-700 bg-zinc-900"
                }`}>
                  {task.status === "COMPLETED" && <span className="text-emerald-400 text-[10px]">✓</span>}
                </span>
                <span className={task.status === "COMPLETED" ? "text-zinc-400 line-through" : "text-zinc-200"}>
                  {task.title}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps guide */}
      <div className="grid grid-cols-3 gap-3 text-center">
        {[
          { step: "1", label: "Start photo", desc: "Take a pic when you begin" },
          { step: "2", label: "End photo", desc: "Take a pic when you finish" },
          { step: "3", label: "Reflection", desc: "Write what you learned" },
        ].map((s) => (
          <div key={s.step} className="rounded-xl border border-zinc-800 bg-zinc-950/40 px-3 py-3">
            <span className="text-xs font-bold text-primary">Step {s.step}</span>
            <p className="text-sm font-medium text-white mt-1">{s.label}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{s.desc}</p>
          </div>
        ))}
      </div>

      {/* The actual form */}
      <CheckinForm groupId={id} tasks={todayTasks} />
      <MobileGroupNav groupId={id} active="checkin" />
    </div>
  );
}
