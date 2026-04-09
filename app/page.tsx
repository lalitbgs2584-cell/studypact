import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { StudyPactLogo } from "@/components/shared/studypact-logo";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      
      {/* Navbar */}
      <header className="flex items-center justify-between p-6 lg:px-12 backdrop-blur-sm border-b border-white/5 z-10 w-full relative">
        <div className="flex items-center gap-2">
          <StudyPactLogo size="sm" labelClassName="text-xl" />
        </div>
        <div className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="text-zinc-300 hover:text-white hover:bg-white/10">Log in</Button>
          </Link>
          <Link href="/signup">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_15px_rgba(var(--primary),0.3)]">Get Started</Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 mt-12 z-10 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sm text-zinc-300 mb-8 animate-fade-in">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Commit to your learning journey
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tighter max-w-4xl leading-tight mb-6 animate-in slide-in-from-bottom-4 duration-700">
          The ultimate <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">accountability </span> framework for your studies.
        </h1>
        
        <p className="text-xl text-zinc-400 max-w-2xl mb-10 animate-in slide-in-from-bottom-6 duration-1000">
          Put your money where your mouth is. Form study groups, deposit stakes, and earn them back through daily check-ins.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 animate-in slide-in-from-bottom-8 duration-1000">
          <Link href="/signup">
            <Button size="lg" className="h-14 px-8 text-lg w-full sm:w-auto shadow-[0_0_30px_rgba(var(--primary),0.4)]">
              Start your first Pact <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline" className="h-14 px-8 text-lg w-full sm:w-auto bg-transparent border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white">
              Go to Dashboard
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-8 text-center text-zinc-600 text-sm z-10 border-t border-white/5 mt-auto bg-black/40 backdrop-blur-xl relative">
        StudyPact &copy; {new Date().getFullYear()}. For learners who get things done.
      </footer>
    </div>
  );
}
