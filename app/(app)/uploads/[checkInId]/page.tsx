/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatDayKey } from "@/lib/studypact";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { UploadReviewActions } from "@/components/shared/upload-review-actions";

export default async function UploadReviewDetailPage({
  params,
}: {
  params: Promise<{ checkInId: string }>;
}) {
  const { checkInId } = await params;
  const user = await requireSessionUser(`/uploads/${checkInId}`);

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
      group: {
        select: {
          id: true,
          name: true,
          createdById: true,
        },
      },
      tasks: {
        select: {
          title: true,
          status: true,
        },
      },
      startFiles: {
        orderBy: {
          uploadedAt: "asc",
        },
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      endFiles: {
        orderBy: {
          uploadedAt: "asc",
        },
        select: {
          id: true,
          name: true,
          url: true,
        },
      },
      verifications: {
        include: {
          reviewer: {
            select: {
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!checkIn) {
    notFound();
  }

  const membership = await getGroupMembership(user.id, checkIn.groupId);
  if (!membership) {
    notFound();
  }

  const isLeader = membership.role === "admin" && checkIn.group.createdById === user.id;
  const canPeerReview = checkIn.status === "PENDING" && checkIn.userId !== user.id;
  const canLeaderResolve = checkIn.status === "FLAGGED" && isLeader && checkIn.userId !== user.id;
  const approvalCount = checkIn.verifications.filter((verification) => verification.verdict === "APPROVE").length;
  const rejectCount = checkIn.verifications.filter((verification) => verification.verdict === "FLAG").length;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Link
          href="/uploads"
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to uploads
        </Link>
      </div>

      <div className="rounded-3xl border border-border bg-card/80 p-6">
        <div className="flex flex-col gap-4 border-b border-border pb-6 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">{checkIn.user.name}</p>
            <p className="text-sm text-muted-foreground">{checkIn.group.name}</p>
            <p className="mt-2 text-xs text-muted-foreground">Submitted for {formatDayKey(checkIn.day)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {approvalCount} accept
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {rejectCount} reject
            </span>
            <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
              {checkIn.status}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="space-y-6">
            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Question / Tasks</p>
              <div className="rounded-2xl border border-border bg-background/70 p-4">
                {checkIn.tasks.length ? (
                  <div className="space-y-2">
                    {checkIn.tasks.map((task) => (
                      <div key={`${checkIn.id}-${task.title}`} className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-foreground">{task.title}</span>
                        <span className="rounded-full border border-border bg-card px-2.5 py-1 text-xs text-muted-foreground">
                          {task.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No task text was attached to this upload.</p>
                )}
              </div>
            </section>

            <section className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Uploads</p>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground">Start Uploads</p>
                  <div className="mt-3 space-y-3">
                    {checkIn.startFiles.length ? (
                      checkIn.startFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-2xl border border-border"
                        >
                          <img src={file.url} alt={file.name} className="h-48 w-full object-cover" />
                          <div className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                            {file.name}
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        No start uploads
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-background/70 p-4">
                  <p className="text-xs text-muted-foreground">End Uploads</p>
                  <div className="mt-3 space-y-3">
                    {checkIn.endFiles.length ? (
                      checkIn.endFiles.map((file) => (
                        <a
                          key={file.id}
                          href={file.url}
                          target="_blank"
                          rel="noreferrer"
                          className="block overflow-hidden rounded-2xl border border-border"
                        >
                          <img src={file.url} alt={file.name} className="h-48 w-full object-cover" />
                          <div className="border-t border-border bg-card px-3 py-2 text-xs text-muted-foreground">
                            {file.name}
                          </div>
                        </a>
                      ))
                    ) : (
                      <div className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                        No end uploads
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-2xl border border-border bg-background/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Submission Notes</p>
              <div className="mt-4 space-y-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">Proof text</p>
                  <p className="mt-1 text-foreground">{checkIn.proofText || "No proof text attached."}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Reflection</p>
                  <p className="mt-1 text-foreground">{checkIn.reflection || "No reflection attached."}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Proof link</p>
                  {checkIn.proofLink ? (
                    <a
                      href={checkIn.proofLink}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-flex text-primary hover:underline"
                    >
                      Open link
                    </a>
                  ) : (
                    <p className="mt-1 text-foreground">No proof link attached.</p>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-background/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review Decision</p>
              <div className="mt-4">
                {canPeerReview ? (
                  <UploadReviewActions checkInId={checkIn.id} mode="peer" />
                ) : null}
                {canLeaderResolve ? (
                  <UploadReviewActions checkInId={checkIn.id} mode="leader" />
                ) : null}
                {!canPeerReview && !canLeaderResolve ? (
                  <div className="rounded-2xl border border-dashed border-border px-4 py-6 text-sm text-muted-foreground">
                    {checkIn.status === "APPROVED" ? (
                      <span className="inline-flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 className="h-4 w-4" />
                        This upload was already approved.
                      </span>
                    ) : checkIn.status === "FLAGGED" ? (
                      <span className="inline-flex items-center gap-2 text-amber-300">
                        <Clock3 className="h-4 w-4" />
                        Waiting for the group leader to make the final call.
                      </span>
                    ) : checkIn.status === "REJECTED" ? (
                      <span className="inline-flex items-center gap-2 text-red-300">
                        <ShieldAlert className="h-4 w-4" />
                        This upload was rejected by the leader.
                      </span>
                    ) : (
                      "You cannot review this upload."
                    )}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-background/70 p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Review History</p>
              <div className="mt-4 space-y-3">
                {checkIn.verifications.length ? (
                  checkIn.verifications.map((verification) => (
                    <div key={verification.id} className="rounded-2xl border border-border bg-card px-4 py-3">
                      <p className="text-sm font-medium text-foreground">{verification.reviewer.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{verification.verdict}</p>
                      {verification.note ? (
                        <p className="mt-2 text-sm text-foreground">{verification.note}</p>
                      ) : null}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">No votes yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
