"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global app error", error);
  }, [error]);

  return (
    <html>
      <body className="min-h-screen bg-black text-white">
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950/70 p-10 text-center backdrop-blur-xl">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Something went wrong</h1>
            <p className="mt-3 text-sm text-zinc-400">
              We hit an unexpected issue while rendering this page. You can retry now or head back to the dashboard.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button type="button" onClick={reset}>
                Try Again
              </Button>
              <Link href="/dashboard">
                <Button variant="outline">Go to Dashboard</Button>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
