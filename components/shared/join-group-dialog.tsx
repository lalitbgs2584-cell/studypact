"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LinkIcon, Loader2 } from "lucide-react";
import { joinGroupByCodeAction } from "@/lib/actions/studypact";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function JoinGroupDialog() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleJoin = () => {
    setError(null);

    startTransition(async () => {
      const result = await joinGroupByCodeAction(value);

      if (!result.success || !result.groupId) {
        setError(result.error || "Could not join this group");
        return;
      }

      setValue("");
      router.push(`/group/${result.groupId}/feed`);
      router.refresh();
    });
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" className="gap-2 border-zinc-700 text-zinc-100" />}>
        <LinkIcon className="w-4 h-4" />
        Join by Code
      </DialogTrigger>
      <DialogContent className="border-zinc-800 bg-zinc-950 text-zinc-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join a StudyPact group</DialogTitle>
          <DialogDescription className="text-zinc-400">
            Paste the full invite link or just the invite code and we&apos;ll take care of the rest.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <Label htmlFor="invite-code" className="text-zinc-300">Invite Link or Code</Label>
            <Input
              id="invite-code"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              placeholder="https://.../join/ABCDEFGH or ABCDEFGH"
              className="bg-zinc-900 border-zinc-800 text-zinc-100"
            />
          </div>

          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button
            type="button"
            onClick={handleJoin}
            disabled={isPending || !value.trim()}
            className="w-full"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            Join Group
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
