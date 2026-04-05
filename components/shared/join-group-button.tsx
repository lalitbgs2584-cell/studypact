import { Button } from "@/components/ui/button";
import { LinkIcon } from "lucide-react";

export function JoinGroupButton({ inviteToken }: { inviteToken: string }) {
  return (
    <Button variant="outline" className="gap-2 border-primary/30 text-primary hover:bg-primary/10 w-full sm:w-auto">
      <LinkIcon className="w-4 h-4" />
      Join with Token ({inviteToken})
    </Button>
  );
}
