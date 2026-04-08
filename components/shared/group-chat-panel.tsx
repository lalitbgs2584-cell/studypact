"use client";

import { useEffect, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { createGroupMessageAction } from "@/lib/actions/studypact";
import { Loader2, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";

type GroupChatPanelProps = {
  groupId: string;
  messages: Array<{
    id: string;
    content: string;
    createdAt: Date;
    userName: string;
  }>;
};

export function GroupChatPanel({ groupId, messages }: GroupChatPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [content, setContent] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, 15000);

    return () => window.clearInterval(intervalId);
  }, [router]);

  const handleSend = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createGroupMessageAction({ groupId, content });
        setContent("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-zinc-100">Group Chat</h3>
          <p className="text-xs text-zinc-500">Messages and updates visible to everyone here</p>
        </div>
      </div>

      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-3">
              <p className="text-sm text-zinc-100">{message.content}</p>
              <p className="mt-2 text-xs text-zinc-500">{message.userName} • {new Date(message.createdAt).toLocaleString("en-IN")}</p>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            No chat messages yet. Drop an update for the group.
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Share a progress update, ask a question, or drop a quick note..."
          className="min-h-24 bg-zinc-900/50 border-zinc-800 focus-visible:ring-primary/50 text-zinc-100 rounded-xl"
        />
        {error ? <p className="text-sm text-red-400">{error}</p> : null}
        <Button disabled={isPending || !content.trim()} type="button" onClick={handleSend} className="w-full">
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          Send Message
        </Button>
      </div>
    </div>
  );
}
