"use client";

import { useState, useTransition } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UploadButton } from "@/lib/uploadthing/uploadthing";
import { submitCheckInAction } from "@/lib/actions/studypact";
import { Camera, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

type CheckinFormProps = {
  groupId: string;
};

type UploadSlot = "start" | "end";

type UploadedProof = {
  fileId: string;
  url: string;
} | null;

type UploadPanelProps = {
  title: string;
  helper: string;
  groupId: string;
  slot: UploadSlot;
  uploadedProof: UploadedProof;
  onUploaded: (proof: UploadedProof) => void;
};

function UploadPanel({
  title,
  helper,
  groupId,
  slot,
  uploadedProof,
  onUploaded,
}: UploadPanelProps) {
  const isUploaded = Boolean(uploadedProof?.url);

  return (
    <div className="space-y-3">
      <label className="text-sm font-medium text-zinc-300 ml-1">{title}</label>

      {isUploaded && uploadedProof?.url ? (
        <div className="relative rounded-2xl overflow-hidden border border-primary/30 bg-zinc-900">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={uploadedProof.url}
            alt={`${title} preview`}
            className="w-full max-h-56 object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between gap-3 bg-black/70 backdrop-blur-sm px-4 py-2">
            <span className="text-xs text-emerald-400 font-medium flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5" /> {title} uploaded
            </span>
            <UploadButton
              endpoint="attachmentUploader"
              input={{ groupId, slot }}
              appearance={{
                button: "ut-ready:bg-zinc-700 ut-ready:hover:bg-zinc-600 ut-ready:text-xs ut-ready:h-7 ut-ready:px-3 ut-uploading:bg-zinc-700",
                allowedContent: "hidden",
              }}
              onClientUploadComplete={(res) => {
                const item = res?.[0];
                onUploaded(item?.serverData ? { fileId: item.serverData.fileId, url: item.url } : null);
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
            />
          </div>
        </div>
      ) : (
        <div className="border-2 border-dashed border-zinc-700/50 rounded-2xl min-h-48 flex flex-col items-center justify-center bg-zinc-900/50 hover:bg-zinc-800/50 hover:border-primary/50 transition-all group px-6 py-8 text-center">
          <div className="bg-zinc-800 p-4 rounded-full group-hover:scale-110 transition-transform">
            <Camera className="w-6 h-6 text-zinc-400 group-hover:text-primary transition-colors" />
          </div>
          <p className="mt-4 text-sm font-medium text-zinc-300">Upload {title.toLowerCase()}</p>
          <p className="text-xs text-zinc-500 mt-1">{helper}</p>
          <div className="mt-5">
            <UploadButton
              endpoint="attachmentUploader"
              input={{ groupId, slot }}
              appearance={{
                button:
                  "ut-ready:bg-primary ut-ready:hover:bg-primary/90 ut-uploading:bg-primary/80 ut-label:text-primary-foreground ut-allowed-content:text-zinc-500",
                allowedContent: "text-zinc-500 text-xs",
              }}
              onClientUploadComplete={(res) => {
                const item = res?.[0];
                onUploaded(item?.serverData ? { fileId: item.serverData.fileId, url: item.url } : null);
              }}
              onUploadError={(error: Error) => {
                toast.error(`Upload failed: ${error.message}`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function CheckinForm({ groupId }: CheckinFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [startProof, setStartProof] = useState<UploadedProof>(null);
  const [endProof, setEndProof] = useState<UploadedProof>(null);
  const [reflection, setReflection] = useState("");
  const [proofText, setProofText] = useState("");
  const [proofLink, setProofLink] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = () => {
    if (!startProof?.fileId || !endProof?.fileId) {
      return;
    }

    startTransition(async () => {
      try {
        const result = await submitCheckInAction({
          groupId,
          reflection,
          proofText,
          proofLink,
          startFileId: startProof.fileId,
          endFileId: endProof.fileId,
        });

        if (result.success) {
          setMessage("Check-in submitted for peer review.");
          router.refresh();
        }
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Failed to submit check-in");
      }
    });
  };

  return (
    <Card className="bg-gradient-to-b from-zinc-900 to-black border-zinc-800 shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-indigo-500 to-purple-600"></div>
      <CardHeader>
        <CardTitle className="text-xl">Daily Check-in</CardTitle>
        <CardDescription className="text-zinc-400">Upload proof of your work and a short reflection.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <UploadPanel
          title="Start Pic"
          helper="PNG, JPG, HEIC up to 4MB"
          groupId={groupId}
          slot="start"
          uploadedProof={startProof}
          onUploaded={setStartProof}
        />

        <UploadPanel
          title="End Pic"
          helper="PNG, JPG, HEIC up to 4MB"
          groupId={groupId}
          slot="end"
          uploadedProof={endProof}
          onUploaded={setEndProof}
        />

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Proof Note / Commit / Update</label>
          <Textarea
            value={proofText}
            onChange={(event) => setProofText(event.target.value)}
            placeholder="Paste a GitHub commit, describe the proof, or add a short update..."
            className="resize-none h-20 bg-zinc-900/50 border-zinc-800 focus-visible:ring-primary/50 text-zinc-100 rounded-xl"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Proof Link</label>
          <input
            value={proofLink}
            onChange={(event) => setProofLink(event.target.value)}
            placeholder="GitHub, LeetCode, docs, or demo link..."
            className="w-full h-12 rounded-xl border border-zinc-800 bg-zinc-900/50 px-3 text-sm text-zinc-100 outline-none"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-zinc-300 ml-1">Daily Reflection</label>
          <Textarea
            value={reflection}
            onChange={(event) => setReflection(event.target.value)}
            placeholder="What did you study today? Explain briefly..."
            className="resize-none h-24 bg-zinc-900/50 border-zinc-800 focus-visible:ring-primary/50 text-zinc-100 rounded-xl"
          />
        </div>

        {message ? <p className="text-sm text-zinc-400">{message}</p> : null}
      </CardContent>
      <CardFooter>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={!startProof?.fileId || !endProof?.fileId || isPending}
          className="w-full sm:w-auto ml-auto rounded-xl px-8 shadow-[0_0_20px_rgba(var(--primary),0.2)]"
        >
          {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          Submit Check-in
        </Button>
      </CardFooter>
    </Card>
  );
}
