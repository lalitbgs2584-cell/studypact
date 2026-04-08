import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function BlockedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-6 text-white">
      <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-950/70 p-10 text-center backdrop-blur-xl">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
          <ShieldAlert className="h-8 w-8 text-red-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">Account Access Restricted</h1>
        <p className="mt-3 text-sm text-zinc-400">
          This account has been blocked by a platform admin. If you think this is a mistake, contact support or the group organizer.
        </p>
        <div className="mt-6">
          <Link href="/">
            <Button variant="outline">Back to Home</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
