import { notFound } from "next/navigation";
import { BookOpen } from "lucide-react";
import { GroupNav } from "@/components/shared/group-nav";
import { prisma } from "@/lib/db";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";
import { DocsClient } from "./docs-client";

export default async function GroupDocsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/docs`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) notFound();

  const documents = await prisma.groupDocument.findMany({
    where: { groupId: id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3">
          <BookOpen className="w-8 h-8 text-indigo-400" /> Group Documents
        </h1>
        <p className="text-zinc-400">
          Resources, statements, and materials posted by the group leader for {membership.group.name}.
        </p>
      </div>

      <GroupNav groupId={id} active="docs" />

      <DocsClient
        groupId={id}
        isAdmin={membership.role === "admin"}
        documents={documents.map((d) => ({
          id: d.id,
          title: d.title,
          content: d.content,
          fileUrl: d.fileUrl,
          fileName: d.fileName,
          createdAt: d.createdAt,
        }))}
      />
    </div>
  );
}
