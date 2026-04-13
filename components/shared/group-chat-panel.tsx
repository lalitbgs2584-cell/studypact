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
    <div className="w-full bg-background border border-rule shadow-[0_0_40px_rgba(0,0,0,0.8)] relative z-10 flex flex-col">
      {/* Header */}
      <div className="border-b border-rule p-4 md:p-6 flex justify-between items-baseline bg-surface/50">
        <div className="font-mono text-xs text-parchment-muted tracking-widest uppercase">
          TRIBUNAL COMMUNICATIONS
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={isRefreshing}
          onClick={() => {
            startRefreshTransition(() => {
              router.refresh();
            });
          }}
          className="font-mono text-[10px] text-wax border border-primary px-2 py-1 tracking-widest hover:bg-wax hover:text-parchment h-auto rounded-none"
        >
          {isRefreshing ? <Loader2 className="w-3 h-3 animate-spin mr-1 inline" /> : <RefreshCcw className="w-3 h-3 mr-1 inline" />}
          SYNC PROTOCOL
        </Button>
      </div>

      <div className="flex flex-col gap-0 max-h-[400px] overflow-y-auto">
        {messages.length > 0 ? (
          messages.map((message) => (
            <div key={message.id} className="border-b border-rule bg-surface p-4 md:p-6 flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="size-2 rounded-full bg-foreground" />
                  <span className="font-serif text-lg text-parchment">
                    {message.userName}
                  </span>
                </div>
                <span className="font-mono text-[10px] tracking-widest text-parchment-muted uppercase">
                  {new Date(message.createdAt).toLocaleString("en-GB", {
                    hour: "2-digit",
                    minute: "2-digit",
                    day: "2-digit",
                    month: "short"
                  })}
                </span>
              </div>

              {message.content ? (
                <p className="font-serif text-base text-parchment-muted leading-relaxed pl-5">
                  {message.content}
                </p>
              ) : (
                <p className="font-mono text-xs italic text-parchment-muted pl-5 uppercase tracking-wide">
                  [EVIDENCE SUBMITTED]
                </p>
              )}

              {message.imageUrl ? (
                <div className="mt-2 border border-rule bg-surface p-1 ml-5">
                  <div className="border border-rule/50 relative flex items-center justify-center bg-background/50">
                    <a
                      href={message.imageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block w-full"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={message.imageUrl}
                        alt={message.imageName || "Evidence"}
                        className="max-h-64 object-cover mx-auto"
                      />
                    </a>
                  </div>
                  {message.imageName && (
                    <div className="mt-2 font-mono text-[10px] text-parchment-muted tracking-widest uppercase">
                      REF: {message.imageName}
                    </div>
                  )}
                </div>
              ) : null}

              <div className="mt-2 flex flex-wrap gap-2 pl-5">
                {(Object.keys(reactionMeta) as ReactionKind[]).map((kind) => {
                  const reaction = message.reactions.find((item) => item.kind === kind);
                  const count = reaction?.count ?? 0;
                  const active = reaction?.active ?? false;

                  return (
                    <button
                      key={kind}
                      type="button"
                      onClick={() => handleReaction(message.id, kind)}
                      className={`font-mono text-[10px] tracking-widest uppercase px-2 py-1 transition-colors border ${
                        active
                          ? "border-primary text-wax bg-primary/10"
                          : "border-rule text-parchment-muted hover:text-foreground"
                      }`}
                    >
                      {reactionMeta[kind]} {count > 0 ? `| ${count}` : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="p-8 text-center border-b border-rule">
            <span className="font-mono text-xs text-parchment-muted tracking-widest uppercase border border-foreground px-3 py-2 bg-background/80">
              COMMUNICATIONS LOG EMPTY
            </span>
          </div>
        )}
      </div>

      <div className="p-4 md:p-6 bg-background flex flex-col gap-4">
        <div>
          <div className="font-mono text-[10px] text-parchment-muted tracking-widest uppercase mb-2">
            SUBMIT COMMUNICATION
          </div>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Input statement..."
            className="min-h-24 border-rule bg-surface/50 text-parchment font-serif focus-visible:ring-primary/50 focus-visible:border-primary rounded-none"
          />
        </div>

        <div className="border border-rule bg-surface/30 p-4">
          <div className="flex items-center gap-2 font-mono text-[10px] tracking-widest uppercase text-parchment-muted mb-2">
            <ImagePlus className="h-3 w-3 text-wax" />
            Append Optical Evidence
          </div>
          
          <div className="mt-3">
            <UploadButton
              endpoint="groupMessageImageUploader"
              input={{ groupId }}
              appearance={{
                button: "ut-ready:bg-wax ut-ready:hover:bg-wax-deep ut-uploading:bg-wax/50 ut-label:text-parchment font-mono text-[10px] tracking-widest uppercase rounded-none border border-primary px-4 py-2 w-full",
                allowedContent: "text-parchment-muted font-mono text-[10px] uppercase",
                container: "w-fit"
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
            <div className="mt-4 border border-rule bg-background p-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={attachment.url}
                alt={attachment.name || "Pending evidence"}
                className="max-h-32 object-cover"
              />
              <div className="mt-2 font-mono text-[10px] text-wax tracking-widest uppercase">
                APPENDED: {attachment.name}
              </div>
            </div>
          ) : null}
        </div>

        {error ? <p className="font-mono text-[10px] text-wax tracking-widest uppercase border border-wax bg-wax/10 p-2">{error}</p> : null}

        <Button
          disabled={isPending || (!content.trim() && !attachment?.url)}
          type="button"
          onClick={handleSend}
          className="bg-wax hover:bg-wax-deep text-parchment font-mono text-xs tracking-widest uppercase px-8 py-4 border border-primary transition-colors w-full rounded-none h-auto"
        >
          {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin inline" /> : null}
          EXECUTE TRANSMISSION
        </Button>
      </div>
    </div>
  );
}
