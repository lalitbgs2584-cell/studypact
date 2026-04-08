"use client";

import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, LockKeyhole, Sparkles } from "lucide-react";
import { resetPasswordAction } from "@/lib/actions/studypact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function ResetPasswordFallback() {
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

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">Loading reset link</h1>
        <p className="text-zinc-400 max-w-xs">
          Verifying your password reset request.
        </p>
      </div>
    </div>
  );
}

function ResetPasswordPageContent() {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = searchParams.get("token") || "";
  const tokenError = searchParams.get("error");

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await resetPasswordAction({
        token,
        newPassword,
        confirmPassword,
      });

      if (!result.success) {
        setError(result.error || "Could not reset password");
        return;
      }

      setSuccess(true);
    });
  };

  const invalidToken = tokenError === "INVALID_TOKEN" || !token;

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-black relative">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-black to-black -z-10"></div>

      <div className="w-full max-w-md bg-zinc-900/40 border border-zinc-800/80 backdrop-blur-xl rounded-3xl p-8 lg:p-10 text-center animate-in zoom-in-95 duration-500 shadow-2xl flex flex-col items-center">
        <Link href="/" className="flex items-center gap-2 mb-8 group">
          <Sparkles className="w-6 h-6 text-primary group-hover:scale-110 transition-transform" />
          <span className="font-bold text-xl tracking-tight text-white">StudyPact</span>
        </Link>

        <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
          {success ? <CheckCircle2 className="w-8 h-8 text-emerald-400" /> : <LockKeyhole className="w-8 h-8 text-primary" />}
        </div>

        <h1 className="text-2xl font-bold text-white tracking-tight mb-2">
          {success ? "Password Updated" : "Choose a New Password"}
        </h1>

        {success ? (
          <>
            <p className="text-zinc-400 mb-8 max-w-xs">
              Your password has been reset successfully. You can sign in with your new credentials now.
            </p>
            <Link href="/login" className="w-full">
              <Button className="w-full">Go to Login</Button>
            </Link>
          </>
        ) : invalidToken ? (
          <>
            <p className="text-zinc-400 mb-8 max-w-xs">
              This password reset link is invalid or has already expired. Request a fresh one to continue.
            </p>
            <Link href="/forgot-password" className="w-full">
              <Button className="w-full">Request New Link</Button>
            </Link>
          </>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 w-full text-left">
            <div className="space-y-2">
              <Label htmlFor="newPassword" className="text-zinc-300">New Password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="bg-zinc-900 border-zinc-800 h-12"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-zinc-300">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="bg-zinc-900 border-zinc-800 h-12"
                required
              />
            </div>

            {error ? <p className="text-sm text-red-400">{error}</p> : null}

            <Button disabled={isPending} className="w-full font-medium h-12 shadow-[0_0_20px_rgba(var(--primary),0.3)]">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reset Password"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
