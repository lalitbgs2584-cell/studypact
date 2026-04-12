/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { ArrowRight, Images, ShieldAlert } from "lucide-react";
import { requireSessionUser } from "@/lib/server/studypact";
import { prisma } from "@/lib/db";

export default async function UploadsPage() {
  const user = await requireSessionUser("/uploads");

  const memberships = await prisma.userGroup.findMany({
    where: {
      userId: user.id,
    },
    select: {
      groupId: true,
      role: true,
    },
  });

  const groupIds = memberships.map((membership) => membership.groupId);
  const leaderGroupIds = memberships
    .filter((membership) => membership.role === "admin")
    .map((membership) => membership.groupId);

  const [pendingReviews, escalatedReviews] = await Promise.all([
    prisma.checkIn.findMany({
      where: {
        groupId: {
          in: groupIds,
        },
        userId: {
          not: user.id,
        },
        status: "PENDING",
        verifications: {
          none: {
            reviewerId: user.id,
          },
        },
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        group: {
          select: {
            name: true,
          },
        },
        startFiles: {
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            url: true,
          },
        },
        endFiles: {
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            url: true,
          },
        },
        tasks: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.checkIn.findMany({
      where: {
        groupId: {
          in: leaderGroupIds,
        },
        userId: {
          not: user.id,
        },
        status: "FLAGGED",
      },
      include: {
        user: {
          select: {
            name: true,
          },
        },
        group: {
          select: {
            name: true,
          },
        },
        startFiles: {
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            url: true,
          },
        },
        endFiles: {
          take: 1,
          orderBy: {
            uploadedAt: "desc",
          },
          select: {
            url: true,
          },
        },
        tasks: {
          select: {
            title: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    }),
  ]);

  const sections = [
    {
      key: "pending",
      title: "Uploads To Review",
      description: "Peer submissions waiting for your accept or reject vote.",
      items: pendingReviews,
      empty: "No pending uploads to review right now.",
      icon: Images,
    },
    {
      key: "leader",
      title: "Leader Escalations",
      description: "Uploads that reached the reject threshold and now need the group leader.",
      items: escalatedReviews,
      empty: "No escalated uploads are waiting for the leader.",
      icon: ShieldAlert,
    },
  ] as const;

  return (
    <div className="space-y-8">
      <div className="border-b border-border pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Uploads</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Review teammate uploads here instead of hunting through the group feed.
        </p>
      </div>

      {sections.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.key} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-border bg-card p-3">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                <p className="text-sm text-muted-foreground">{section.description}</p>
              </div>
            </div>

            {section.items.length ? (
              <div className="grid gap-4 md:grid-cols-2">
                {section.items.map((item) => (
                  <Link
                    key={item.id}
                    href={`/uploads/${item.id}`}
                    className="group rounded-3xl border border-border bg-card/80 p-5 transition-colors hover:border-primary/40 hover:bg-card"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold text-foreground">{item.user.name}</p>
                        <p className="text-xs text-muted-foreground">{item.group.name}</p>
                      </div>
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                        {section.key === "leader" ? "Leader review" : "Peer review"}
                      </span>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-3">
                      {[item.startFiles[0]?.url ?? null, item.endFiles[0]?.url ?? null].map((url, index) => (
                        <div
                          key={`${item.id}-${index}`}
                          className="overflow-hidden rounded-2xl border border-border bg-background"
                        >
                          {url ? (
                            <img
                              src={url}
                              alt={index === 0 ? "Start upload" : "End upload"}
                              className="h-28 w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-28 items-center justify-center px-3 text-center text-xs text-muted-foreground">
                              No upload
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Task</p>
                      <p className="mt-1 line-clamp-2 text-sm text-foreground">
                        {item.tasks.map((task) => task.title).join(", ") || "No task text available"}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 text-sm font-medium text-primary">
                      Open review <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-border bg-card/40 px-6 py-10 text-center text-sm text-muted-foreground">
                {section.empty}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
