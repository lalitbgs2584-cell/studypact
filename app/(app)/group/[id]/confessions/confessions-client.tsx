"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThumbsUp, MessageSquareDashed } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { postConfessionAction, upvoteConfessionAction } from "@/lib/actions/studypact";

type Confession = {
  id: string;
  content: string;
  createdAt: Date;
  upvoteCount: number;
  hasUpvoted: boolean;
  isOwn: boolean;
};

export function ConfessionsClient({
  groupId,
  isAdmin,
  hasPostedThisWeek,
  confessions,
}: {
  groupId: string;
  isAdmin: boolean;
  currentUserId: string;
  hasPostedThisWeek: boolean;
  confessions: Confession[];
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handlePost() {
    setLoading(true);
    setError("");
    try {
      await postConfessionAction({ groupId, content });
      setContent("");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpvote(id: string) {
    await upvoteConfessionAction(id);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {!hasPostedThisWeek && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/60 p-5 space-y-4">
          <p className="text-sm text-zinc-400">Your message will appear anonymously to other members.</p>
          <Textarea
            placeholder="Say something anonymously..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={4}
            className="bg-zinc-900 border-zinc-700 text-white"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <Button onClick={handlePost} disabled={loading || !content.trim()}>
            {loading ? "Posting..." : "Post Anonymously"}
          </Button>
        </div>
      )}

      {hasPostedThisWeek && (
        <div className="rounded-xl border border-violet-500/20 bg-violet-500/10 px-4 py-3 text-sm text-violet-300">
          You&apos;ve already posted your confession this week.
        </div>
      )}

      {confessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 px-6 py-16 text-center text-zinc-500">
          <MessageSquareDashed className="w-10 h-10 mx-auto mb-3 text-zinc-700" />
          <p>No confessions this week yet. Be the first.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {confessions.map((c, i) => (
            <div key={c.id} className="rounded-2xl border border-zinc-800 bg-zinc-950/40 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap flex-1">{c.content}</p>
                <button
                  onClick={() => handleUpvote(c.id)}
                  className={`flex items-center gap-1.5 text-sm rounded-xl px-3 py-1.5 border transition-colors ${
                    c.hasUpvoted
                      ? "border-violet-500/40 bg-violet-500/10 text-violet-300"
                      : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-zinc-100"
                  }`}
                >
                  <ThumbsUp className="w-3.5 h-3.5" />
                  {c.upvoteCount}
                </button>
              </div>
              <p className="text-xs text-zinc-600">
                {isAdmin ? `Anonymous #{${i + 1}}` : "Anonymous"} · {new Date(c.createdAt).toLocaleString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
