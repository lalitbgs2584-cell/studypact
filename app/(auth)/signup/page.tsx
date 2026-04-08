"use client";

import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Sparkles, Loader2 } from "lucide-react";

function SignupPageFallback() {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black text-white">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-900/50 border-r border-zinc-800 relative overflow-hidden order-2">
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/20 via-zinc-950 to-black"></div>
        <div className="relative z-10 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="font-bold text-2xl tracking-tight">StudyPact</span>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12 relative order-1">
        <div className="w-full max-w-md space-y-6 animate-in fade-in zoom-in-95 duration-700 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <div>
            <h1 className="text-3xl font-bold mb-2">Loading sign up</h1>
            <p className="text-zinc-400">Preparing your account creation flow.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const redirectTo = searchParams.get("redirectTo") || "/dashboard";

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await authClient.signUp.email({
      email,
      password,
      name,
    });

    if (error) {
      setError(error.message || "Failed to sign up.");
      setLoading(false);
    } else {
      router.push(redirectTo);
    }
  };

  const handleGoogleSignUp = async () => {
    await authClient.signIn.social({
      provider: "google",
      callbackURL: redirectTo,
    });
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-black text-white">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-zinc-900/50 border-r border-zinc-800 relative overflow-hidden order-2">
        <div 
          className="absolute inset-0 z-0 bg-[url('https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop')] bg-cover bg-center opacity-40 grayscale"
        ></div>
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-transparent z-0"></div>
        <div className="absolute inset-0 bg-gradient-to-bl from-primary/30 to-emerald-500/30 z-0 mix-blend-overlay"></div>
        <div className="relative z-10 flex items-center gap-3">
          <Sparkles className="w-8 h-8 text-primary" />
          <span className="font-bold text-2xl tracking-tight">StudyPact</span>
        </div>
        <div className="relative z-10">
          <h2 className="text-5xl font-bold tracking-tighter leading-tight mb-4">
            Build habits. <br/> Together.
          </h2>
          <p className="text-zinc-400 text-lg max-w-md">
            The ultimate accountability tool for serious technical learners and bootcamp cohorts.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 lg:p-12 relative order-1">
        <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center lg:text-left">
            <h1 className="text-3xl font-bold mb-2">Create an account</h1>
            <p className="text-zinc-400">Join StudyPact to start your first commitment pool</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-lg text-center">
              {error}
            </div>
          )}

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-zinc-300">Full Name</Label>
              <Input 
                id="name" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe" 
                className="bg-zinc-900 border-zinc-800 h-12" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-300">Email Address</Label>
              <Input 
                id="email" 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu" 
                className="bg-zinc-900 border-zinc-800 h-12" 
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-300">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-zinc-900 border-zinc-800 h-12" 
                required
              />
            </div>

            <Button disabled={loading} type="submit" className="w-full h-12 text-md font-medium mt-6 shadow-[0_0_30px_rgba(var(--primary),0.2)] hover:shadow-[0_0_40px_rgba(var(--primary),0.4)] transition-all">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign Up"}
            </Button>
          </form>

          <div className="relative mt-8 mb-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-zinc-800" />
            </div>
            <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
              <span className="bg-black px-3 text-zinc-500">Or continue with</span>
            </div>
          </div>

          <Button 
            type="button" 
            variant="outline" 
            onClick={handleGoogleSignUp}
            className="w-full h-12 bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800 hover:text-white transition-all shadow-sm"
          >
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
            Sign up with Google
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Already have an account?{" "}
            <Link href={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} className="text-white hover:text-primary transition-colors font-medium">
              Sign in instead
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}
