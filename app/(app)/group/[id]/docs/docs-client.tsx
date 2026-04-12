"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Plus, Trash2, FileText, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { createGroupDocumentAction, deleteGroupDocumentAction } from "@/lib/actions/studypact";

type Doc = {
  id: string;
  title: string;
  content: string;
  fileUrl: string | null;
  fileName: string | null;
  createdAt: Date;
};

export function DocsClient({ groupId, isAdmin, documents }: { groupId: string; isAdmin: boolean; documents: Doc[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCreate() {
    setLoading(true);
    setError("");
    try {
      await createGroupDocumentAction({ groupId, title, content, fileUrl: fileUrl || undefined, fileName: fileName || undefined });
      setTitle(""); setContent(""); setFileUrl(""); setFileName(""); setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post document");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    await deleteGroupDocumentAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {isAdmin && (
        <div>
          {!open ? (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Post Document
            </Button>
          ) : (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
              <h3 className="text-lg font-semibold text-white">New Document</h3>
              <Input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              <Textarea placeholder="Content / statement / instructions..." value={content} onChange={(e) => setContent(e.target.value)} rows={5} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="File URL (optional)" value={fileUrl} onChange={(e) => setFileUrl(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              <Input placeholder="File name (optional)" value={fileName} onChange={(e) => setFileName(e.target.value)} className="bg-zinc-900 border-zinc-700 text-white" />
              {error && <p className="text-sm text-red-400">{error}</p>}
              <div className="flex gap-3">
                <Button onClick={handleCreate} disabled={loading || !title || !content}>
                  {loading ? "Posting..." : "Post"}
                </Button>
                <Button variant="outline" onClick={() => setOpen(false)} className="border-zinc-700 text-zinc-300">Cancel</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {documents.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center text-zinc-500">
          <BookOpen className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>No documents posted yet. The group leader can share resources here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {documents.map((doc) => (
            <div key={doc.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                    <FileText className="w-5 h-5 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{doc.title}</h3>
                    <p className="text-xs text-zinc-500">{new Date(doc.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDelete(doc.id)} className="text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{doc.content}</p>
              {doc.fileUrl && (
                <a href={doc.fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
                  <Link2 className="w-4 h-4" /> {doc.fileName || "Attached file"}
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
