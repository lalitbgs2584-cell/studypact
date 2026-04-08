/* eslint-disable @next/next/no-img-element */
import { ImageIcon, Link2 } from "lucide-react";
import { notFound } from "next/navigation";
import { GroupNav } from "@/components/shared/group-nav";
import { prisma } from "@/lib/db";
import { getGroupMembership, requireSessionUser } from "@/lib/server/studypact";

function isImage(url: string) {
  return /\.(png|jpe?g|gif|webp|heic|svg)$/i.test(url);
}

export default async function GroupGalleryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireSessionUser(`/group/${id}/gallery`);
  const membership = await getGroupMembership(user.id, id);

  if (!membership) {
    notFound();
  }

  const [startFiles, endFiles] = await Promise.all([
    prisma.startFile.findMany({
      where: {
        groupId: id,
      },
      include: {
        user: true,
        checkIn: true,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    }),
    prisma.endFile.findMany({
      where: {
        groupId: id,
      },
      include: {
        user: true,
        checkIn: true,
      },
      orderBy: {
        uploadedAt: "desc",
      },
    }),
  ]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="border-b border-zinc-800/80 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Proof Gallery</h1>
        <p className="text-zinc-400">
          Review historical proof uploads for {membership.group.name}.
        </p>
      </div>

      <GroupNav groupId={id} active="gallery" />

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">Start Proofs</h2>
          <p className="text-sm text-zinc-500">How members started the session.</p>
        </div>
        {startFiles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {startFiles.map((file) => (
              <div key={file.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 aspect-video flex items-center justify-center">
                  {isImage(file.url) ? (
                    <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-zinc-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Preview unavailable</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{file.user.name}</p>
                  <p className="text-xs text-zinc-500">{file.uploadedAt.toLocaleString("en-IN")}</p>
                </div>
                <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  Open file <Link2 className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center text-zinc-500">
            No start proofs have been uploaded yet.
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-white">End Proofs</h2>
          <p className="text-sm text-zinc-500">How members ended the session.</p>
        </div>
        {endFiles.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {endFiles.map((file) => (
              <div key={file.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-4 space-y-3">
                <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/60 aspect-video flex items-center justify-center">
                  {isImage(file.url) ? (
                    <img src={file.url} alt={file.name} className="h-full w-full object-cover" />
                  ) : (
                    <div className="text-center text-zinc-500">
                      <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                      <p className="text-sm">Preview unavailable</p>
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-100">{file.user.name}</p>
                  <p className="text-xs text-zinc-500">{file.uploadedAt.toLocaleString("en-IN")}</p>
                </div>
                <a href={file.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  Open file <Link2 className="w-4 h-4" />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-12 text-center text-zinc-500">
            No end proofs have been uploaded yet.
          </div>
        )}
      </section>
    </div>
  );
}
