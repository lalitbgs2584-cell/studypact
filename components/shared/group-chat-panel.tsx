"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, MessageSquare, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  createGroupMessageAction,
  toggleGroupMessageReactionAction,
} from "@/lib/actions/studypact";
import { UploadButton } from "@/lib/uploadthing/uploadthing";

type ReactionKind = "FIRE" | "CLAP" | "TARGET" | "ROCKET";

type UploadedChatImage = {
  name: string;
  storageKey: string;
  url: string;
} | null;

type GroupChatPanelProps = {
  groupId: string;
  messages: Array<{
    id: string;
    content: string | null;
    createdAt: Date;
    imageName: string | null;
    imageUrl: string | null;
    userName: string;
    reactions: Array<{
      kind: ReactionKind;
      count: number;
      active: boolean;
    }>;
  }>;
};

const reactionMeta: Record<ReactionKind, string> = {
  FIRE: "Fire",
  CLAP: "Clap",
  TARGET: "Target",
  ROCKET: "Rocket",
};

export function GroupChatPanel({ groupId, messages }: GroupChatPanelProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isRefreshing, startRefreshTransition] = useTransition();
  const [content, setContent] = useState("");
  const [attachment, setAttachment] = useState<UploadedChatImage>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSend = () => {
    setError(null);
    startTransition(async () => {
      try {
        await createGroupMessageAction({
          groupId,
          content,
          imageName: attachment?.name,
          imageStorageKey: attachment?.storageKey,
          imageUrl: attachment?.url,
        });
        setContent("");
        setAttachment(null);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      }
    });
  };

  const handleReaction = (messageId: string, kind: ReactionKind) => {
    startTransition(async () => {
      try {
        await toggleGroupMessageReactionAction({ messageId, kind });
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not react to this message");
      }
    });
  };

  return (
    <div className="rounded-2xl border border-zinc-800/60 bg-black/20 p-5 backdrop-blur-lg">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="rounded-xl border border-primary/20 bg-primary/10 p-2">
            <MessageSquare className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-zinc-100">Group Posts</h3>
            <p className="text-xs text-zinc-500">
              Share study notes, questions, and photos with everyone in this group
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isRefreshing}
          onClick={() => {
            startRefreshTransition(() => {
              router.refresh();
            });
          }}
          className="border-zinc-700 bg-zinc-900/70 text-zinc-200 hover:bg-zinc-800"
        >
          {isRefreshing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCcw className="w-3.5 h-3.5" />}
          Refresh
        </Button>
      </div>

      <div className="max-h-80 space-y-3 overflow-y-auto pr-1">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.id} className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-3 py-3">
              {message.content ? (
                <p className="text-sm text-zinc-100">{message.content}</p>
              ) : (
                <p className="text-sm italic text-zinc-400">Shared a photo with the group.</p>
              )}

              {message.imageUrl ? (
                <a
                  href={message.imageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 block overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950"
                >
                  <img
                    src={message.imageUrl}
                    alt={message.imageName || "Group post image"}
                    className="max-h-64 w-full object-cover"
                  />
                </a>
              ) : null}

              <p className="mt-2 text-xs text-zinc-500">
                {message.userName} | {new Date(message.createdAt).toLocaleString("en-IN")}
                {message.imageName ? ` | ${message.imageName}` : ""}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {(Object.keys(reactionMeta) as ReactionKind[]).map((kind) => {
                  const reaction = message.reactions.find((item) => item.kind === kind);
                  const count = reaction?.count ?? 0;
                  const active = reaction?.active ?? false;

                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => handleReaction(message.id, kind)}
                      className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                        active
                          ? "border-primary/40 bg-primary/15 text-primary"
                          : "border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-100"
                      }`}
                    >
                      {reactionMeta[kind]} {count > 0 ? count : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-zinc-800 px-4 py-8 text-center text-sm text-zinc-500">
            No group posts yet. Share a note or question with the team.
          </div>
        )}
      </div>

      <div className="mt-4 space-y-3">
        <Textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Ask the group to solve something, share what to read, or drop a quick update..."
          className="min-h-24 rounded-xl border-zinc-800 bg-zinc-900/50 text-zinc-100 focus-visible:ring-primary/50"
        />

        <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
          <div className="flex items-center gap-2 text-sm text-zinc-200">
            <ImagePlus className="h-4 w-4 text-primary" />
            Add a photo for the group
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            Upload a screenshot, question, notes page, or roadmap image. Every member in this group will see it.
          </p>
          <div className="mt-3">
            <UploadButton
              endpoint="groupMessageImageUploader"
              input={{ groupId }}
              appearance={{
                button:
                  "ut-ready:bg-primary ut-ready:hover:bg-primary/90 ut-uploading:bg-primary/80 ut-label:text-primary-foreground ut-allowed-content:text-zinc-500",
                allowedContent: "text-zinc-500 text-xs",
              }}
              onClientUploadComplete={(res) => {
                const item = res?.[0];
                if (!item?.serverData) {
                  setError("Upload finished, but the image could not be attached.");
                  return;
                }

                setAttachment({
                  name: item.serverData.fileName,
                  storageKey: item.serverData.storageKey,
                  url: item.serverData.url,
                });
                setError(null);
              }}
              onUploadError={(uploadError: Error) => {
                setError(uploadError.message);
              }}
            />
          </div>

          {attachment?.url ? (
            <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40">
              <img
                src={attachment.url}
                alt={attachment.name || "Pending group post image"}
                className="max-h-52 w-full object-cover"
              />
              <div className="px-3 py-2 text-xs text-zinc-400">
                Ready to post: {attachment.name}
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="text-sm text-red-400">{error}</p> : null}

        <Button
          disabled={isPending || (!content.trim() && !attachment?.url)}
          type="button"
          onClick={handleSend}
          className="w-full"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Share with Group
        </Button>
      </div>
    </div>
  );
}
