"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { createGroupAction } from "@/lib/actions/studypact";
import { Textarea } from "@/components/ui/textarea";
import { Copy, ExternalLink, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";

export function CreateGroupForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [invitePath, setInvitePath] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const inviteLink =
    invitePath && typeof window !== "undefined"
      ? `${window.location.origin}${invitePath}`
      : null;

  const handleSubmit = (formData: FormData) => {
    setError(null);
    setInviteCode(null);
    setInvitePath(null);
    setInviteExpiresAt(null);

    startTransition(async () => {
      try {
        const result = await createGroupAction(formData);
        if (!result.success) {
          setError(result.error || "Failed to create group");
          return;
        }

        setInviteCode(result.inviteCode ?? null);
        setInvitePath(result.invitePath ?? null);
        setInviteExpiresAt(result.inviteExpiresAt ?? null);
        formRef.current?.reset();
        router.refresh();
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "Failed to create group",
        );
      }
    });
  };

  const handleCopy = async () => {
    if (!inviteLink) {
      return;
    }

    await navigator.clipboard.writeText(inviteLink);
  };

  return (
    <Card className="bg-black/40 border-zinc-800/80 backdrop-blur-xl max-w-xl mx-auto mt-8">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-white">Create Study Group</CardTitle>
        <CardDescription className="text-zinc-400">Set up a new commitment pool with your peers.</CardDescription>
      </CardHeader>
      <form ref={formRef} action={handleSubmit}>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-zinc-300">Group Name</Label>
            <Input name="name" id="name" placeholder="e.g. Algorithms Fall 2026" className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description" className="text-zinc-300">Description</Label>
            <Textarea name="description" id="description" placeholder="What is this accountability circle for?" className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white min-h-24" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dailyPenalty" className="text-zinc-300">Daily Penalty Points</Label>
            <Input name="dailyPenalty" id="dailyPenalty" type="number" defaultValue={10} className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maxMembers" className="text-zinc-300">Member Limit</Label>
              <Input name="maxMembers" id="maxMembers" type="number" min={2} defaultValue={8} className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
              <p className="text-xs text-zinc-500">5-10 members tends to be the strongest accountability range.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="inviteExpiresInDays" className="text-zinc-300">Invite Expires In (Days)</Label>
              <Input name="inviteExpiresInDays" id="inviteExpiresInDays" type="number" min={1} defaultValue={7} className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="visibility" className="text-zinc-300">Group Visibility</Label>
            <select
              name="visibility"
              id="visibility"
              defaultValue="PRIVATE"
              className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
            >
              <option value="PRIVATE">Private - invite only</option>
              <option value="PUBLIC">Public - searchable and joinable</option>
            </select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="focusType" className="text-zinc-300">Group Type</Label>
              <select
                name="focusType"
                id="focusType"
                defaultValue="GENERAL"
                className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
              >
                <option value="GENERAL">General accountability</option>
                <option value="DSA">DSA focused</option>
                <option value="DEVELOPMENT">Development focused</option>
                <option value="EXAM_PREP">Exam prep</option>
                <option value="MACHINE_LEARNING">Machine learning</option>
                <option value="CUSTOM">Custom goals</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="penaltyMode" className="text-zinc-300">Penalty Mode</Label>
              <select
                name="penaltyMode"
                id="penaltyMode"
                defaultValue="BURN"
                className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
              >
                <option value="BURN">Burn - penalties are pure loss</option>
                <option value="POOL">Pool - penalties build a reward pool</option>
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="taskPostingMode" className="text-zinc-300">Checklist Posting</Label>
            <select
              name="taskPostingMode"
              id="taskPostingMode"
              defaultValue="ALL_MEMBERS"
              className="w-full h-11 rounded-xl border border-zinc-800 bg-zinc-900 px-3 text-sm text-zinc-100 outline-none"
            >
              <option value="ALL_MEMBERS">All members can post daily checklist items</option>
              <option value="ADMINS_ONLY">Only admins can post group checklist items</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="link" className="text-zinc-300">Reference Link (Optional)</Label>
            <Input name="link" id="link" type="url" placeholder="https://docs.google.com/..." className="bg-zinc-900 border-zinc-800 focus-visible:ring-primary/50 text-white" />
          </div>
          {inviteCode ? (
            <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-4 text-sm text-zinc-100 space-y-3">
              <p>
                Invite code generated: <span className="font-mono font-semibold">{inviteCode}</span>
              </p>
              {inviteLink ? (
                <div className="space-y-2">
                  <p className="text-zinc-300 break-all">{inviteLink}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button type="button" variant="secondary" onClick={handleCopy} className="gap-2">
                      <Copy className="w-4 h-4" /> Copy invite link
                    </Button>
                    <Button type="button" variant="outline" onClick={() => window.open(inviteLink, "_blank", "noopener,noreferrer")} className="gap-2">
                      Open invite page <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
              {inviteExpiresAt ? (
                <p className="text-xs text-zinc-400">
                  This invite link expires on {new Date(inviteExpiresAt).toLocaleString("en-IN")}
                </p>
              ) : null}
            </div>
          ) : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}
        </CardContent>
        <CardFooter>
          <Button type="submit" disabled={isPending} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-medium tracking-wide">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Create Group & Generate Invite Code"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}
