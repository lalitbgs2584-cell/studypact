"use client";

import { Suspense, useState, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { KeyRound, Loader2, Sparkles } from "lucide-react";
import { requestPasswordResetAction } from "@/lib/actions/studypact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ForgotPasswordFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-black to-black -z-10"></div>

      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-8 lg:p-10 text-center animate-in zoom-in-95 duration-500 shadow-2xl flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xl tracking-tight text-white">StudyPact</span>
        </Link>

        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Loading reset form</h1>
        <p className="text-zinc-400 max-w-xs">
          Preparing the password recovery flow.
        </p>
      </div>
    </div>
  );
}

function ForgotPasswordPageContent() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    setError(null);

    startTransition(async () => {
      const result = await requestPasswordResetAction({ email });

      if (!result.success) {
        setError(result.error || "Could not send reset email");
        return;
      }

      setMessage(result.message || "Check your email for the reset link.");
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-black to-black -z-10"></div>

      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-8 lg:p-10 text-center animate-in zoom-in-95 duration-500 shadow-2xl flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xl tracking-tight text-white">StudyPact</span>
        </Link>

        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
          <KeyRound className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Reset Password</h1>
        <p className="text-zinc-400 mb-8 max-w-xs">
          Enter the email associated with your account and we&apos;ll send you a recovery link.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@university.edu"
              className="bg-zinc-900 border-zinc-800 h-12"
              required
            />
          </div>

          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-red-400">{error}</p> : null}

          <Button disabled={isPending} className="w-full font-medium h-12 shadow-[0_0_20px_rgba(var(--primary),0.3)] hover:shadow-[0_0_30px_rgba(var(--primary),0.5)] transition-all">
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
          </Button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-8">
          Remembered your password?{" "}
          <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-white hover:text-primary transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordPageContent />
    </Suspense>
  );
}
